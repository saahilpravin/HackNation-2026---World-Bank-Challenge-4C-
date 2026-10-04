package com.lauda.api.controller;

import com.lauda.api.dto.Dto;
import com.lauda.api.service.AnalysisService;
import com.lauda.api.service.InsightService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestController
@CrossOrigin(origins = "*")   // development only
public class ReviewController {

    private final AnalysisService analysis;
    private final InsightService insights;

    public ReviewController(AnalysisService analysis, InsightService insights) {
        this.analysis = analysis;
        this.insights = insights;
    }

    @PostMapping("/analyze")
    public Dto.AnalyzeResponse analyze(@RequestBody Dto.AnalyzeRequest r) throws Exception {
        if (r.text() == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "text is required");
        return analysis.analyze(r);
    }

    @PostMapping("/analyze/batch")
    public List<Dto.AnalyzeResponse> batch(@RequestBody Dto.BatchRequest req) throws Exception {
        List<Dto.AnalyzeResponse> out = new ArrayList<>();
        for (Dto.AnalyzeRequest r : req.reviews()) out.add(analysis.analyze(r));
        return out;
    }

    @PostMapping("/insights")
    public Dto.InsightsResponse insights(@RequestBody Dto.InsightsRequest req) {
        return insights.build(req);
    }

    @GetMapping("/health")
    public String health() { return "ok"; }
}