package com.lauda.api.controller;

import com.lauda.api.dto.Dto;
import com.lauda.api.service.ClassifierService;
import com.lauda.api.service.InsightService;
import com.lauda.api.service.ReplyService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/v1")
@CrossOrigin(origins = {"http://localhost:8082", "http://127.0.0.1:8082", "http://localhost:8084", "http://127.0.0.1:8084", "http://localhost:8087", "http://127.0.0.1:8087", "http://localhost:8088", "http://127.0.0.1:8088"})   // dev only; native apps don't need CORS, a web build does
public class ReviewController {
    private static final int MAX_REVIEWS = 500;

    @org.springframework.beans.factory.annotation.Autowired
    private com.lauda.api.service.InsightsLlmService llm;
    private final ClassifierService classifier;
    private final ReplyService replies;
    private final InsightService insights;

    public ReviewController(ClassifierService c, ReplyService r, InsightService i) {
        this.classifier = c; this.replies = r; this.insights = i;
    }

    @PostMapping("/reviews/reply-draft")
    public Dto.ReplyResponse replyDraft(@RequestBody Dto.ReplyRequest req) throws Exception {
        require(req != null && req.review() != null && req.review().text() != null
                && !req.review().text().isBlank(), "review.text is required");
        checkBatch(List.of(req.review()));
        require(req.ownerLanguage() == null || req.ownerLanguage().length() <= 32, "owner language code is too long");
        require(req.businessName() == null || req.businessName().length() <= 200, "business name is too long");
        return replies.draft(req);
    }

    @PostMapping("/reviews/analyze")
    public List<Dto.Analysis> analyze(@RequestBody Dto.BatchRequest req) throws Exception {
        require(req != null, "request is required");
        checkBatch(req.reviews());
        List<Dto.Analysis> out = new ArrayList<>();
        for (Dto.ReviewIn r : req.reviews()) out.add(classifier.analyze(r));
        return out;
    }

    @PostMapping("/insights")
    public Dto.InsightsResponse insights(@RequestBody Dto.InsightsRequest req) throws Exception {
        require(req != null, "request is required");
        checkBatch(req.reviews());
        return insights.withNarrative(req);
    }

    @GetMapping("/health")
    public java.util.Map<String, Object> health() {
        return java.util.Map.of("status", "ok", "model_ready", classifier.ready(), "llm", llm.capabilities());
    }

    private static void checkBatch(List<Dto.ReviewIn> l) {
        require(l != null && !l.isEmpty() && l.size() <= MAX_REVIEWS,
                "reviews must contain 1 to " + MAX_REVIEWS + " items");
        java.util.Set<Integer> ids = new java.util.HashSet<>();
        for (Dto.ReviewIn r : l) {
            require(r != null && r.text() != null && !r.text().isBlank() && r.text().length() <= 4000,
                    "every review needs nonempty text of at most 4000 characters");
            require(ids.add(r.id()), "review IDs must be unique");
            require(r.rating() == null || (r.rating() >= 1 && r.rating() <= 5), "rating must be between 1 and 5");
            require(r.language() == null || r.language().length() <= 32, "language code is too long");
            if (r.date() != null) {
                try { java.time.LocalDate.parse(r.date()); }
                catch (java.time.format.DateTimeParseException e) { require(false, "date must be YYYY-MM-DD"); }
            }
        }
    }

    private static void require(boolean ok, String msg) {
        if (!ok) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}