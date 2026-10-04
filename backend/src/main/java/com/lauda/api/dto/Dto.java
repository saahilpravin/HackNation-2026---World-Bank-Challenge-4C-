package com.lauda.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class Dto {

    public record AnalyzeRequest(int id, String text, String language, Integer rating) {}

    public record AspectHit(String aspect, String sentiment, double score,
                            String evidence, String issue) {}

    public record AnalyzeResponse(
            @JsonProperty("review_id") int reviewId,
            String language,
            Integer rating,
            List<AspectHit> aspects,
            @JsonProperty("overall_sentiment") String overallSentiment,
            @JsonProperty("needs_review") boolean needsReview,
            @JsonProperty("model_version") String modelVersion) {}

    public record BatchRequest(List<AnalyzeRequest> reviews) {}

    public record InsightsRequest(
            @JsonProperty("owner_language") String ownerLanguage,
            List<AnalyzeResponse> reviews) {}

    public record Quote(
            @JsonProperty("review_id") int reviewId,
            String language,
            String text,
            @JsonProperty("text_owner_language") String textOwnerLanguage,
            Integer rating) {}

    public record Finding(
            String aspect, String issue, String title, int count, int total, double share,
            String level, @JsonProperty("level_label") String levelLabel,
            String text, String action, List<Quote> quotes,
            @JsonProperty("review_ids") List<Integer> reviewIds) {}

    public record AspectCount(String aspect, int positive, int negative) {}

    public record InsightsResponse(
            @JsonProperty("owner_language") String ownerLanguage,
            int total, int analysed,
            List<Finding> problems, List<Finding> strengths,
            List<AspectCount> aspects,
            @JsonProperty("unread_review_ids") List<Integer> unreadReviewIds,
            @JsonProperty("unread_note") String unreadNote,
            String note) {}
}