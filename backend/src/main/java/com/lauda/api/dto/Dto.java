package com.lauda.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;
import java.util.Map;

public class Dto {

    // ---------- shared ----------
    public record ReviewIn(int id, String text, String language, Integer rating, String date) {}

    public record AspectHit(String aspect, String sentiment, double score, String evidence) {}

    public record Analysis(
            @JsonProperty("review_id") int reviewId,
            String language, Integer rating, String date,
            List<AspectHit> aspects,
            @JsonProperty("overall_sentiment") String overallSentiment,
            @JsonProperty("needs_review") boolean needsReview,
            @JsonProperty("model_version") String modelVersion) {}

    public record BatchRequest(List<ReviewIn> reviews) {}

    // ---------- reply drafts ----------
    public record ReplyRequest(ReviewIn review,
            @JsonProperty("owner_language") String ownerLanguage,
            @JsonProperty("business_name") String businessName) {}

    public record Draft(String id, String label, String language, String text,
            @JsonProperty("owner_preview") String ownerPreview) {}

    public record ReplyResponse(
            @JsonProperty("review_id") int reviewId,
            Analysis analysis, List<Draft> drafts, List<String> warnings,
            @JsonProperty("requires_approval") boolean requiresApproval,
            @JsonProperty("model_version") String modelVersion) {}

    // ---------- insights ----------
    public record InsightsRequest(
            @JsonProperty("owner_language") String ownerLanguage, List<ReviewIn> reviews) {}

    public record Quote(@JsonProperty("review_id") int reviewId, String language,
                        Integer rating, String text) {}

    public record Finding(String aspect, String label, int count, int total, double share,
            String priority, @JsonProperty("priority_label") String priorityLabel,
            String summary, String action, List<Quote> quotes,
            @JsonProperty("review_ids") List<Integer> reviewIds) {}

    public record AspectStat(String aspect, String label, int positive, int negative,
            @JsonProperty("share_negative") double shareNegative) {}

    public record TrendPoint(String month, int count,
            @JsonProperty("average_rating") Double averageRating, int negative) {}

    public record Quantitative(
            @JsonProperty("average_rating") Double averageRating,
            @JsonProperty("rating_distribution") Map<String, Integer> ratingDistribution,
            Map<String, Integer> sentiment, Map<String, Integer> languages,
            List<AspectStat> aspects, List<TrendPoint> trend) {}

    public record Qualitative(List<Finding> problems, List<Finding> strengths) {}

    public record Attention(@JsonProperty("unread_review_ids") List<Integer> unreadReviewIds,
                            String note) {}

    public record Meta(int total, int analysed, int unread,
            @JsonProperty("owner_language") String ownerLanguage,
            @JsonProperty("model_version") String modelVersion, String note) {}

    public record InsightsResponse(Meta meta, Quantitative quantitative,
                                   Qualitative qualitative, Attention attention) {}
}