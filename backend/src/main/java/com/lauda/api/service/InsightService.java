package com.lauda.api.service;

import com.lauda.api.dto.Dto;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class InsightService {

    private record Ev(int reviewId, String language, Integer rating, String text, double score) {}

    private final Phrasebook pb;
    private final Translator translator;

    public InsightService(Phrasebook pb, Translator translator) {
        this.pb = pb;
        this.translator = translator;
    }

    public Dto.InsightsResponse build(Dto.InsightsRequest req) {
        String requested = req.ownerLanguage();
        String lang = pb.resolve(requested);
        String note = (requested != null && !requested.equals(lang))
                ? "No phrasebook for '" + requested + "' yet; showing English." : null;

        List<Dto.AnalyzeResponse> all = req.reviews() == null ? List.of() : req.reviews();
        List<Integer> unread = new ArrayList<>();
        Map<String, List<Ev>> groups = new LinkedHashMap<>();        // sentiment|aspect|issue
        Map<String, Set<Integer>> aspectIds = new HashMap<>();       // sentiment|aspect
        int analysed = 0;

        for (Dto.AnalyzeResponse r : all) {
            // Guardrail: low-confidence or untested-language reviews are not counted; owner reads them.
            if (r.needsReview()) { unread.add(r.reviewId()); continue; }
            analysed++;
            for (Dto.AspectHit a : r.aspects()) {
                groups.computeIfAbsent(a.sentiment() + "|" + a.aspect() + "|" + a.issue(),
                        k -> new ArrayList<>())
                      .add(new Ev(r.reviewId(), r.language(), r.rating(), a.evidence(), a.score()));
                aspectIds.computeIfAbsent(a.sentiment() + "|" + a.aspect(), k -> new TreeSet<>())
                         .add(r.reviewId());
            }
        }

        List<Dto.Finding> problems = findings(groups, "negative", analysed, lang, 5);
        List<Dto.Finding> strengths = findings(groups, "positive", analysed, lang, 3);

        Set<String> aspects = new TreeSet<>();
        aspectIds.keySet().forEach(k -> aspects.add(k.split("\\|")[1]));
        List<Dto.AspectCount> counts = aspects.stream().map(a -> new Dto.AspectCount(a,
                aspectIds.getOrDefault("positive|" + a, Set.of()).size(),
                aspectIds.getOrDefault("negative|" + a, Set.of()).size())).toList();

        return new Dto.InsightsResponse(lang, all.size(), analysed, problems, strengths, counts,
                unread, unread.isEmpty() ? null : pb.template(lang, "unread"), note);
    }

    private List<Dto.Finding> findings(Map<String, List<Ev>> groups, String sentiment,
                                       int analysed, String lang, int limit) {
        String sign = sentiment.equals("positive") ? "+" : "-";
        return groups.entrySet().stream()
            .filter(e -> e.getKey().startsWith(sentiment + "|"))
            .sorted(Comparator
                .comparingInt((Map.Entry<String, List<Ev>> e) -> e.getValue().size()).reversed()
                .thenComparing(e -> -avg(e.getValue())))
            .limit(limit)
            .map(e -> {
                String[] p = e.getKey().split("\\|");
                String aspect = p[1], issue = p[2], label = aspect + sign;
                List<Ev> evs = new ArrayList<>(e.getValue());
                evs.sort(Comparator.comparingDouble(Ev::score).reversed());

                int n = evs.size();
                double share = analysed == 0 ? 0 : n / (double) analysed;
                String level = (n >= 3 || share >= 0.15) ? "pattern" : n == 2 ? "repeated" : "single";
                String title = pb.title(lang, label, issue);
                String text = pb.template(lang, "finding_" + sentiment)
                        .replace("{count}", String.valueOf(n))
                        .replace("{total}", String.valueOf(analysed))
                        .replace("{title}", title);

                List<Dto.Quote> quotes = evs.stream().limit(3).map(ev -> new Dto.Quote(
                        ev.reviewId(), ev.language(), ev.text(), translate(ev, lang), ev.rating()))
                        .collect(Collectors.toList());

                return new Dto.Finding(aspect, issue, title, n, analysed,
                        Math.round(share * 100) / 100.0, level, pb.levelLabel(lang, level), text,
                        sentiment.equals("negative") ? pb.action(lang, label, issue) : null,
                        quotes,
                        evs.stream().map(Ev::reviewId).sorted().toList());
            }).toList();
    }

    private String translate(Ev ev, String toLang) {
        if (ev.language() == null || ev.language().equals(toLang)) return ev.text();
        try { return translator.translate(ev.text(), ev.language(), toLang); }
        catch (Exception ex) { return null; }       // translation failure must never break the report
    }

    private static double avg(List<Ev> l) {
        return l.stream().mapToDouble(Ev::score).average().orElse(0);
    }
}