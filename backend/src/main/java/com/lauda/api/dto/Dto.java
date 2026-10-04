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
            @JsonProperty("model_version") String modelVersion,
            @JsonProperty("sentiment_source") String sentimentSource, Translation translation) {
        public Analysis(int id, String language, Integer rating, String date, List<AspectHit> aspects, String sentiment, boolean needsReview, String modelVersion, String source) {
            this(id, language, rating, date, aspects, sentiment, needsReview, modelVersion, source, null);
        }
        public Analysis(int id, String language, Integer rating, String date, List<AspectHit> aspects, String sentiment, boolean needsReview, String modelVersion) {
            this(id, language, rating, date, aspects, sentiment, needsReview, modelVersion, aspects.isEmpty() ? (rating == null ? "unknown" : "star-rating") : "aspect-model");
        }
    }

    public record Translation(String status, @JsonProperty("source_language") String sourceLanguage,
            @JsonProperty("model_version") String modelVersion, @JsonProperty("original_text") String originalText,
            @JsonProperty("translated_text") String translatedText, String error) {}
    public record BatchRequest(List<ReviewIn> reviews) {}

    // ---------- reply drafts ----------
    public record ReplyRequest(ReviewIn review,
            @JsonProperty("owner_language") String ownerLanguage,
            @JsonProperty("business_name") String businessName,
            @JsonProperty("business_context") Map<String,String> businessContext) {
        public ReplyRequest(ReviewIn review,String owner,String business) { this(review,owner,business,Map.of()); }
    }
    public record Generation(String status, String source, String model, String digest,
            @JsonProperty("prompt_version") String promptVersion, @JsonProperty("latency_ms") long latencyMs) {}

    public record Draft(String id, String label, String language, String text,
            @JsonProperty("owner_preview") String ownerPreview) {}

    public record ReplyResponse(
            @JsonProperty("review_id") int reviewId,
            Analysis analysis, List<Draft> drafts, List<String> warnings,
            @JsonProperty("requires_approval") boolean requiresApproval,
            @JsonProperty("model_version") String modelVersion, Generation generation) {
        public ReplyResponse(int id,Analysis analysis,List<Draft> drafts,List<String> warnings,boolean approval,String version) {
            this(id,analysis,drafts,warnings,approval,version,null);
        }
    }

    // ---------- insights ----------
    public record InsightsRequest(
            @JsonProperty("owner_language") String ownerLanguage, List<ReviewIn> reviews,
            @JsonProperty("include_narrative") boolean includeNarrative, SummarySettings settings) {
        public InsightsRequest(String language,List<ReviewIn> reviews,boolean narrative) { this(language,reviews,narrative,null); }
        public InsightsRequest(String language, List<ReviewIn> reviews) { this(language, reviews, false,null); }
    }

    public record SummarySettings(String length,String tone,String focus,String language) {
        public static SummarySettings defaults() { return new SummarySettings("brief","professional","balanced","en"); }
        public SummarySettings normalized() {
            String l=length==null?"brief":length,t=tone==null?"professional":tone,f=focus==null?"balanced":focus,lang=language==null?"en":language;
            if(!List.of("brief","standard").contains(l) || !List.of("plain","professional").contains(t) || !List.of("balanced","praise","concerns").contains(f) || lang.isBlank() || lang.length()>32) throw new IllegalArgumentException("Invalid summary settings");
            return new SummarySettings(l,t,f,lang);
        }
    }
    public record SummaryRequest(@JsonProperty("snapshot_id") String snapshotId,SummarySettings settings) {}
    public record Quote(@JsonProperty("review_id") int reviewId, String language,
                        Integer rating, String text, @JsonProperty("original_text") String originalText,
            @JsonProperty("translation_model") String translationModel) {
        public Quote(int id, String language, Integer rating, String text) { this(id, language, rating, text, null, null); }
    }

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
            @JsonProperty("model_version") String modelVersion, String note, int translated,
            @JsonProperty("translation_failed") int translationFailed) {
        public Meta(int total, int analysed, int unread, String ownerLanguage, String modelVersion, String note) {
            this(total, analysed, unread, ownerLanguage, modelVersion, note, 0, 0);
        }
    }

    public record NarrativeNote(String aspect, String polarity, String text,
            @JsonProperty("review_ids") List<Integer> reviewIds) {}
    public record Narrative(String status, String source, String model, String digest,
            @JsonProperty("prompt_version") String promptVersion,
            @JsonProperty("latency_ms") long latencyMs, String summary,
            @JsonProperty("aspect_notes") List<NarrativeNote> aspectNotes, List<String> warnings) {}
    public record InsightJob(String id, String status, int total, int processed, InsightsResponse result, String error) {}
    public record InsightsResponse(Meta meta, Quantitative quantitative,
                                   Qualitative qualitative, Attention attention, Narrative narrative,
            @JsonProperty("snapshot_id") String snapshotId) {
        public InsightsResponse(Meta meta,Quantitative quantitative,Qualitative qualitative,Attention attention,Narrative narrative) { this(meta,quantitative,qualitative,attention,narrative,null); }
        public InsightsResponse(Meta meta, Quantitative quantitative, Qualitative qualitative, Attention attention) {
            this(meta, quantitative, qualitative, attention, null);
        }
    }
}