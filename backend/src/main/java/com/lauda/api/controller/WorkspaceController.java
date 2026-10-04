package com.lauda.api.controller;

import com.lauda.api.dto.Dto;
import com.lauda.api.service.ClassifierService;
import com.lauda.api.service.InsightService;
import com.lauda.api.service.SmallLlmService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

/** Atomic workspace analysis; string IDs survive imports and mobile evidence links. */
@RestController
@CrossOrigin(origins = {"http://localhost:8082", "http://localhost:8084", "http://localhost:8087", "http://127.0.0.1:8087"})
public class WorkspaceController {
    public record Review(String id, String text, String language, Integer rating) {}
    public record Request(List<Review> reviews) {}
    public record Result(String id, List<Dto.AspectHit> aspects, String sentiment, boolean needsReview) {}
    public record Point(String aspect, String sentiment, String text, List<String> reviewIds) {}
    public record Advice(String aspect, String title, String text, List<String> reviewIds) {}
    public record Llm(String model, String status, long latencyMs, List<Advice> advice) {}
    public record Response(String model, String version, String source, long latencyMs,
                           List<String> testedLanguages, List<Result> reviews,
                           List<Point> praised, List<Point> criticized, List<Dto.Suggestion> suggestions, Llm llm) {}
    private final ClassifierService classifier;
    private final InsightService insights;
    private final SmallLlmService llm;
    public WorkspaceController(ClassifierService classifier, InsightService insights, SmallLlmService llm) {
        this.classifier = classifier; this.insights = insights; this.llm=llm;
    }
    static void validate(Request request) {
        if (request == null || request.reviews() == null || request.reviews().size() > 300)
            throw bad("Send at most 300 reviews.");
        Set<String> ids = new HashSet<>();
        for (Review r : request.reviews()) {
            if (r == null || r.id() == null || r.id().isBlank() || r.id().length() > 128 || !ids.add(r.id()))
                throw bad("Review IDs must be unique nonempty strings.");
            if (r.text() == null || r.text().isBlank() || r.text().length() > 4000)
                throw bad("Review text must contain 1–4000 characters.");
            if (r.language() == null || r.language().length() > 32 || r.rating() == null || r.rating() < 1 || r.rating() > 5)
                throw bad("Supply a language code and a rating from 1 to 5.");
        }
    }
    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private List<Point> points(List<Dto.SummaryPoint> points, List<Review> input) {
        return points.stream().map(p -> new Point(p.aspect(), p.sentiment(), p.text(),
            p.reviewIds().stream().map(i -> input.get(i).id()).toList())).toList();
    }
    @PostMapping("/workspace/analyze")
    public synchronized Response analyze(@RequestBody Request request) throws Exception {
        validate(request);
        long start = System.nanoTime();
        List<Dto.AnalyzeResponse> classified = new ArrayList<>();
        List<Result> results = new ArrayList<>();
        for (int i = 0; i < request.reviews().size(); i++) {
            Review r = request.reviews().get(i);
            Dto.AnalyzeResponse result = classifier.analyze(new Dto.AnalyzeRequest(i, r.text(), r.language(), r.rating()));
            classified.add(result);
            results.add(new Result(r.id(), result.aspects(), result.overallSentiment(), result.needsReview()));
        }
        Dto.InsightsResponse summary = insights.build(classified);
        SmallLlmService.Output prose=llm.generate(summary, request.reviews().stream().map(r->new Dto.AnalyzeRequest(0,r.text(),r.language(),r.rating())).toList());
        Llm generated=new Llm(prose.model(), prose.status(), prose.latencyMs(), prose.advice().stream().map(a->new Advice(a.aspect(),a.title(),a.text(),a.reviewIds().stream().map(i->request.reviews().get(i).id()).toList())).toList());
        String version = classified.isEmpty() ? "v1" : classified.get(0).modelVersion();
        return new Response("sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2", version,
            "local-laptop-model", (System.nanoTime() - start) / 1_000_000, List.of("en", "sw"), results,
            points(summary.praised(), request.reviews()), points(summary.criticized(), request.reviews()), summary.suggestions(), generated);
    }
}
