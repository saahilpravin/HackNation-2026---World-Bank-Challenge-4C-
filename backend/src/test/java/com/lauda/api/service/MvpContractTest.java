package com.lauda.api.service;

import com.lauda.api.controller.ReviewController;
import com.lauda.api.dto.Dto;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class MvpContractTest {
    private Dto.ReviewIn review(int id, String language) { return new Dto.ReviewIn(id, "The guide was helpful.", language, 5, "2026-10-03"); }
    @Test void rejectsDuplicateIdsAndInvalidReviewsBeforeInference() throws Exception {
        ClassifierService classifier = mock(ClassifierService.class);
        ReviewController controller = new ReviewController(classifier, mock(ReplyService.class), mock(InsightService.class));
        assertThrows(ResponseStatusException.class, () -> controller.insights(new Dto.InsightsRequest("en", List.of(review(1, "en"), review(1, "en")))));
        assertThrows(ResponseStatusException.class, () -> controller.analyze(new Dto.BatchRequest(List.of(new Dto.ReviewIn(1, "", "en", 9, "not a date")))));
        assertThrows(ResponseStatusException.class, () -> controller.insights(null));
        verifyNoInteractions(classifier);
    }
    @Test void findingsExcludeUncertainReviewsAndPreserveEvidence() throws Exception {
        ClassifierService classifier = mock(ClassifierService.class);
        Dto.ReviewIn first = review(1, "en"), second = review(2, "fr");
        when(classifier.analyze(first)).thenReturn(new Dto.Analysis(1, "en", 5, first.date(), List.of(new Dto.AspectHit("guide", "negative", .8, first.text())), "negative", false, "v1@test"));
        when(classifier.analyze(second)).thenReturn(new Dto.Analysis(2, "fr", 5, second.date(), List.of(), "positive", true, "v1@test"));
        Texts texts = new Texts(); ReflectionTestUtils.setField(texts, "modelDir", "../ml/artifacts"); texts.load();
        Dto.InsightsResponse result = new InsightService(classifier, texts).build(new Dto.InsightsRequest("fr", List.of(first, second)));
        assertEquals(1, result.meta().analysed()); assertEquals("en", result.meta().ownerLanguage());
        assertEquals(List.of(2), result.attention().unreadReviewIds());
        assertEquals("low", result.qualitative().problems().get(0).priority());
        assertEquals(first.text(), result.qualitative().problems().get(0).quotes().get(0).text());
        assertEquals(1, result.qualitative().problems().get(0).quotes().get(0).reviewId());
        assertEquals(5, result.quantitative().averageRating());
    }
}
