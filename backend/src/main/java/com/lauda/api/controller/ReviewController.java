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
@CrossOrigin(origins = "*")   // dev only; native apps don't need CORS, a web build does
public class ReviewController {
    private static final int MAX_REVIEWS = 500;

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
        return replies.draft(req);
    }

    @PostMapping("/reviews/analyze")
    public List<Dto.Analysis> analyze(@RequestBody Dto.BatchRequest req) throws Exception {
        checkBatch(req.reviews());
        List<Dto.Analysis> out = new ArrayList<>();
        for (Dto.ReviewIn r : req.reviews()) out.add(classifier.analyze(r));
        return out;
    }

    @PostMapping("/insights")
    public Dto.InsightsResponse insights(@RequestBody Dto.InsightsRequest req) throws Exception {
        checkBatch(req.reviews());
        return insights.build(req);
    }

    @GetMapping("/health")
    public java.util.Map<String, Object> health() {
        return java.util.Map.of("status", "ok", "model_ready", classifier.ready());
    }

    private static void checkBatch(List<Dto.ReviewIn> l) {
        require(l != null && !l.isEmpty() && l.size() <= MAX_REVIEWS,
                "reviews must contain 1 to " + MAX_REVIEWS + " items");
        for (Dto.ReviewIn r : l) require(r.text() != null, "every review needs text");
    }

    private static void require(boolean ok, String msg) {
        if (!ok) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
    }
}