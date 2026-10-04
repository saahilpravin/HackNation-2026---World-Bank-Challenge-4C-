package com.lauda.api.service;

import com.lauda.api.dto.Dto;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class InsightService {

    private record Ev(Dto.Analysis a, Dto.AspectHit h) {}

    private final ClassifierService classifier;
    private final Texts texts;
    private ReviewAnalysisService analysis;
    @org.springframework.beans.factory.annotation.Autowired
    private InsightsLlmService llm;
    @org.springframework.beans.factory.annotation.Autowired private LocalOutputCache outputCache;
    private final com.fasterxml.jackson.databind.ObjectMapper json=new com.fasterxml.jackson.databind.ObjectMapper().configure(com.fasterxml.jackson.databind.SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS,true);

    public InsightService(ClassifierService classifier, Texts texts) {
        this.classifier = classifier;
        this.texts = texts;
    }

    @org.springframework.beans.factory.annotation.Autowired
    public InsightService(ClassifierService classifier, Texts texts, ReviewAnalysisService analysis) {
        this(classifier,texts); this.analysis=analysis;
    }
    public Dto.InsightsResponse build(Dto.InsightsRequest req) throws Exception { return build(req, n -> {}); }
    public Dto.InsightsResponse build(Dto.InsightsRequest req, java.util.function.IntConsumer progress) throws Exception {
        String requested = req.ownerLanguage();
        String lang = texts.hasInsights(requested) ? requested : "en";
        String note = (requested != null && !requested.equals(lang))
                ? "No text for '" + requested + "' yet; showing English." : null;

        String snapshotId=LocalOutputCache.key("insight-snapshot-v2"+(analysis==null?classifier.modelVersion():analysis.pipelineVersion())+json.writeValueAsString(Arrays.asList(req.ownerLanguage(),req.reviews())));
        if(outputCache!=null) { var saved=outputCache.get(snapshotId,Dto.InsightsResponse.class); if(saved!=null) { progress.accept(req.reviews().size()); return saved; } }
        // 1. classify every review once
        List<Dto.Analysis> all = new ArrayList<>();
        for (Dto.ReviewIn r : req.reviews()) { all.add(analysis == null ? classifier.analyze(r) : analysis.analyze(r)); progress.accept(all.size()); }
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
        var result=new Dto.InsightsResponse(
                new Dto.Meta(all.size(), analysed, unread.size(), lang,
                        all.stream().filter(a -> !a.modelVersion().equals("translation-unavailable")).map(Dto.Analysis::modelVersion).findFirst().orElse("unavailable"), note,
                        (int)all.stream().filter(a -> a.translation()!=null && a.translation().status().equals("translated")).count(),
                        (int)all.stream().filter(a -> a.translation()!=null && a.translation().status().equals("failed")).count()),
                new Dto.Quantitative(avg, dist, sentiment, langs, aspects, trend),
                qual, new Dto.Attention(unread, unreadNote),null,snapshotId);
        // Failed translations must remain retryable, not become a permanent snapshot.
        if(outputCache!=null && result.meta().translationFailed()==0) outputCache.put(snapshotId,result);
        return result;
    }

    public Dto.InsightsResponse withNarrative(Dto.InsightsRequest req) throws Exception {
        return withNarrative(req,n -> {});
    }
    public Dto.InsightsResponse withNarrative(Dto.InsightsRequest req, java.util.function.IntConsumer progress) throws Exception {
        Dto.InsightsResponse base = build(req,progress);
        if (!req.includeNarrative()) return base;
        return new Dto.InsightsResponse(base.meta(), base.quantitative(), base.qualitative(), base.attention(), llm.summarize(base,req.settings()),base.snapshotId());
    }

    public Dto.InsightsResponse summarizeSnapshot(Dto.SummaryRequest request) {
        if(request==null || request.snapshotId()==null || !request.snapshotId().matches("[a-f0-9]{64}")) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"Valid snapshot_id is required");
        var base=outputCache.get(request.snapshotId(),Dto.InsightsResponse.class);
        if(base==null) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND,"Saved analysis expired. Refresh reviews first.");
        return new Dto.InsightsResponse(base.meta(),base.quantitative(),base.qualitative(),base.attention(),llm.summarize(base,request.settings()),base.snapshotId());
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
                        v.a().reviewId(), v.a().language(), v.a().rating(), v.h().evidence(),
                        v.a().translation()==null?null:v.a().translation().originalText(),
                        v.a().translation()==null?null:v.a().translation().modelVersion())).toList();
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