package com.lauda.api.service;

import com.lauda.api.dto.Dto;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class InsightService {

    private record Ev(Dto.Analysis a, Dto.AspectHit h) {}

    private final ClassifierService classifier;
    private final Texts texts;
    @org.springframework.beans.factory.annotation.Autowired
    private InsightsLlmService llm;

    public InsightService(ClassifierService classifier, Texts texts) {
        this.classifier = classifier;
        this.texts = texts;
    }

    public Dto.InsightsResponse build(Dto.InsightsRequest req) throws Exception {
        String requested = req.ownerLanguage();
        String lang = texts.hasInsights(requested) ? requested : "en";
        String note = (requested != null && !requested.equals(lang))
                ? "No text for '" + requested + "' yet; showing English." : null;

        // 1. classify every review once
        List<Dto.Analysis> all = new ArrayList<>();
        for (Dto.ReviewIn r : req.reviews()) all.add(classifier.analyze(r));
        List<Dto.Analysis> ok = all.stream().filter(a -> !a.needsReview()).toList();
        List<Integer> unread = all.stream().filter(Dto.Analysis::needsReview)
                .map(Dto.Analysis::reviewId).toList();

        // 2. quantitative (pure counting)
        Map<String, Integer> dist = new LinkedHashMap<>();
        for (int s = 1; s <= 5; s++) dist.put(String.valueOf(s), 0);
        Map<String, Integer> sentiment = new TreeMap<>();
        Map<String, Integer> langs = new TreeMap<>();
        for (Dto.Analysis a : all) {
            if (a.rating() != null && a.rating() >= 1 && a.rating() <= 5)
                dist.merge(String.valueOf(a.rating()), 1, Integer::sum);
            sentiment.merge(a.overallSentiment(), 1, Integer::sum);
            langs.merge(a.language() == null ? "unknown" : a.language(), 1, Integer::sum);
        }
        Double avg = round(all.stream().filter(a -> a.rating() != null)
                .mapToInt(Dto.Analysis::rating).average());

        Map<String, int[]> perAspect = new TreeMap<>();            // [positive, negative]
        Map<String, List<Ev>> groups = new HashMap<>();            // "sentiment|aspect"
        for (Dto.Analysis a : ok)
            for (Dto.AspectHit h : a.aspects()) {
                perAspect.computeIfAbsent(h.aspect(), k -> new int[2])[h.sentiment().equals("positive") ? 0 : 1]++;
                groups.computeIfAbsent(h.sentiment() + "|" + h.aspect(), k -> new ArrayList<>()).add(new Ev(a, h));
            }
        int analysed = ok.size();
        List<Dto.AspectStat> aspects = perAspect.entrySet().stream().map(e -> new Dto.AspectStat(
                e.getKey(), aspectName(lang, e.getKey()), e.getValue()[0], e.getValue()[1],
                analysed == 0 ? 0 : Math.round(e.getValue()[1] * 100.0 / analysed) / 100.0)).toList();

        Map<String, List<Dto.Analysis>> byMonth = new TreeMap<>();
        for (Dto.Analysis a : all)
            if (a.date() != null && a.date().length() >= 7)
                byMonth.computeIfAbsent(a.date().substring(0, 7), k -> new ArrayList<>()).add(a);
        List<Dto.TrendPoint> trend = byMonth.entrySet().stream().map(e -> new Dto.TrendPoint(
                e.getKey(), e.getValue().size(),
                round(e.getValue().stream().filter(a -> a.rating() != null)
                        .mapToInt(Dto.Analysis::rating).average()),
                (int) e.getValue().stream().filter(a -> a.overallSentiment().equals("negative")).count())).toList();

        // 3. qualitative (fixed text + original quotes)
        Dto.Qualitative qual = new Dto.Qualitative(
                findings(groups, "negative", analysed, lang, 5),
                findings(groups, "positive", analysed, lang, 3));

        String unreadNote = unread.isEmpty() ? null : texts.getOrEn(lang, "insights", "unread");
        return new Dto.InsightsResponse(
                new Dto.Meta(all.size(), analysed, unread.size(), lang,
                        all.isEmpty() ? null : all.get(0).modelVersion(), note),
                new Dto.Quantitative(avg, dist, sentiment, langs, aspects, trend),
                qual, new Dto.Attention(unread, unreadNote));
    }

    public Dto.InsightsResponse withNarrative(Dto.InsightsRequest req) throws Exception {
        Dto.InsightsResponse base = build(req);
        if (!req.includeNarrative()) return base;
        return new Dto.InsightsResponse(base.meta(), base.quantitative(), base.qualitative(), base.attention(), llm.summarize(base));
    }

    private List<Dto.Finding> findings(Map<String, List<Ev>> groups, String sentiment,
                                       int analysed, String lang, int limit) {
        boolean neg = sentiment.equals("negative");
        return groups.entrySet().stream()
            .filter(e -> e.getKey().startsWith(sentiment + "|"))
            .sorted(Comparator.<Map.Entry<String, List<Ev>>>comparingInt(e -> e.getValue().size()).reversed().thenComparing(Map.Entry::getKey))
            .limit(limit)
            .map(e -> {
                String aspect = e.getKey().split("\\|")[1];
                List<Ev> evs = new ArrayList<>(e.getValue());
                evs.sort(Comparator.comparingDouble((Ev v) -> v.h().score()).reversed());
                int n = evs.size();
                double share = analysed == 0 ? 0 : Math.round(n * 100.0 / analysed) / 100.0;
                String priority = !neg ? null : n >= 3 ? "high" : n == 2 ? "medium" : "low";
                String name = aspectName(lang, aspect);
                String summary = texts.getOrEn(lang, "insights", neg ? "problem" : "strength")
                        .replace("{count}", String.valueOf(n)).replace("{total}", String.valueOf(analysed))
                        .replace("{aspect}", name);
                List<Dto.Quote> quotes = evs.stream().limit(3).map(v -> new Dto.Quote(
                        v.a().reviewId(), v.a().language(), v.a().rating(), v.h().evidence())).toList();
                return new Dto.Finding(aspect, name, n, analysed, share, priority,
                        priority == null ? null : texts.getOrEn(lang, "insights", "priority", priority),
                        summary, neg ? texts.getOrEn(lang, "insights", "actions", aspect) : null,
                        quotes, evs.stream().map(v -> v.a().reviewId()).sorted().toList());
            }).toList();
    }

    private String aspectName(String lang, String aspect) {
        String n = texts.getOrEn(lang, "insights", "aspect_names", aspect);
        return n != null ? n : aspect;
    }

    private static Double round(OptionalDouble d) {
        return d.isPresent() ? Math.round(d.getAsDouble() * 100.0) / 100.0 : null;
    }
}