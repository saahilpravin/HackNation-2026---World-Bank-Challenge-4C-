package com.lauda.api.controller;

import com.lauda.api.dto.Dto;
import com.lauda.api.service.ClassifierService;
import com.lauda.api.service.InsightService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@CrossOrigin(origins = {"http://localhost:8082", "http://localhost:8084", "http://localhost:8087", "http://127.0.0.1:8087"})
public class ReviewController {

    private final ClassifierService classifier;
    private final InsightService insights;

    public ReviewController(ClassifierService classifier, InsightService insights) {
        this.classifier = classifier;
        this.insights = insights;
    }

    @PostMapping("/analyze/batch")
    public java.util.List<Dto.AnalyzeResponse> analyzeBatch(@RequestBody Dto.BatchRequest req) throws Exception {
        java.util.List<Dto.AnalyzeResponse> out = new java.util.ArrayList<>();
        for (Dto.AnalyzeRequest r : req.reviews()) out.add(classifier.analyze(r));
        return out;
    }

    @PostMapping("/insights")
    public Dto.InsightsResponse insights(@RequestBody Dto.InsightsRequest req) {
        return insights.build(req.reviews());
    }

    @PostMapping("/analyze")
    public Dto.AnalyzeResponse analyze(@RequestBody Dto.AnalyzeRequest request) throws Exception {
        if (request.text() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "text is required");
        }
        return classifier.analyze(request);
    }

    @GetMapping("/health")
    public String health() {
        return "ok";
    }
}