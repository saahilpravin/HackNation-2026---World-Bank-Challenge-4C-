package com.lauda.api.service;

import com.lauda.api.dto.Dto;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class InsightService {

    // Fixed list of suggestions: the tool can only say what is written here.
    private static final Map<String, String> FIXES = Map.of(
        "guide", "Brief your guides on pacing and common visitor questions; consider a short script for the first 10 minutes.",
        "coffee_tasting", "Lengthen the tasting and offer at least three samples; check roast freshness before each group.",
        "price_value", "State exactly what the price includes in every booking message, and avoid extra charges on the day.",
        "communication", "Confirm every booking within one day and send a short what-to-bring and arrival message.",
        "facilities", "Add shade and seating near the start, and check the toilets before each visit.",
        "access_transport", "Send a map pin, landmarks, and a driver-friendly description with each confirmation.",
        "food", "Confirm dietary needs when booking and prepare a simple vegetarian option.",
        "other", "Read these reviews yourself; they are general comments that do not fit one category.");

    private static final Map<String, String> NAMES = Map.of(
        "guide", "the guide", "coffee_tasting", "the coffee tasting", "price_value", "price and value",
        "communication", "communication", "facilities", "facilities",
        "access_transport", "getting to the farm", "food", "the food", "other", "general comments");

    public Dto.InsightsResponse build(List<Dto.AnalyzeResponse> reviews) {
        int total = reviews.size();
        // key = aspect|sentiment -> distinct review ids
        Map<String, Set<Integer>> hits = new HashMap<>();
        for (Dto.AnalyzeResponse r : reviews) {
            for (Dto.AspectHit a : r.aspects()) {
                hits.computeIfAbsent(a.aspect() + "|" + a.sentiment(), k -> new TreeSet<>()).add(r.reviewId());
            }
        }
        List<Dto.SummaryPoint> praised = top(hits, "positive", total);
        List<Dto.SummaryPoint> criticized = top(hits, "negative", total);
        List<Dto.Suggestion> suggestions = criticized.stream()
                .map(p -> new Dto.Suggestion(p.aspect(), FIXES.get(p.aspect())))
                .toList();
        return new Dto.InsightsResponse(total, praised, criticized, suggestions);
    }

    private List<Dto.SummaryPoint> top(Map<String, Set<Integer>> hits, String sentiment, int total) {
        return hits.entrySet().stream()
                .filter(e -> e.getKey().endsWith("|" + sentiment))
                .sorted((a, b) -> b.getValue().size() - a.getValue().size())
                .limit(3)
                .map(e -> {
                    String aspect = e.getKey().split("\\|")[0];
                    int n = e.getValue().size();
                    String verb = sentiment.equals("positive") ? "mention a positive experience with"
                                                               : "raise a concern about";
                    String text = n + " of " + total + " reviews " + verb + " " + NAMES.get(aspect) + ".";
                    return new Dto.SummaryPoint(aspect, sentiment, n, total, text, new ArrayList<>(e.getValue()));
                })
                .collect(Collectors.toList());
    }
}