package com.lauda.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class Dto {
    public record BatchRequest(List<AnalyzeRequest> reviews) {}

    public record InsightsRequest(List<AnalyzeResponse> reviews) {}

    public record SummaryPoint(String aspect, String sentiment, int count, int total,
                            String text,
                            @JsonProperty("review_ids") List<Integer> reviewIds) {}

    public record Suggestion(String aspect, String text) {}

    public record InsightsResponse(int total, List<SummaryPoint> praised,
                                List<SummaryPoint> criticized, List<Suggestion> suggestions) {}

    /** What the frontend sends to POST /analyze. */
    public record AnalyzeRequest(int id, String text, String language, Integer rating) {}

    /** One detected aspect, e.g. guide / positive / 0.84. */
    public record AspectHit(String aspect, String sentiment, double score) {}

    /** What the API returns. Field names match the JSON contract agreed with the frontend. */
    public record AnalyzeResponse(
            @JsonProperty("review_id") int reviewId,
            List<AspectHit> aspects,
            @JsonProperty("overall_sentiment") String overallSentiment,
            @JsonProperty("needs_review") boolean needsReview,
            @JsonProperty("model_version") String modelVersion) {}
}