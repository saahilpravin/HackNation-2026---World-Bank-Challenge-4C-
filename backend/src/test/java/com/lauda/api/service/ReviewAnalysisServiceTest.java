package com.lauda.api.service;
import com.lauda.api.dto.Dto;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class ReviewAnalysisServiceTest {
    @Test void translatesFrenchBeforeClassificationAndKeepsOriginal() throws Exception {
        var classifier=mock(ClassifierService.class); var translator=mock(ReviewTranslationService.class);
        var original=new Dto.ReviewIn(31,"Notre guide était excellent.","fr",5,"2026-10-04");
        var english=new Dto.ReviewIn(31,"Our guide was excellent.","en",5,"2026-10-04");
        when(translator.translate(original.text(),"fr")).thenReturn(new ReviewTranslationService.Output(english.text(),"nllb@pinned"));
        when(classifier.analyze(english)).thenReturn(new Dto.Analysis(31,"en",5,english.date(),List.of(new Dto.AspectHit("guide","positive",.9,english.text())),"positive",false,"classifier@head"));
        var result=new ReviewAnalysisService(classifier,translator).analyze(original);
        assertFalse(result.needsReview()); assertEquals("fr",result.language()); assertEquals(original.text(),result.translation().originalText()); assertEquals(english.text(),result.translation().translatedText()); assertEquals("nllb@pinned",result.translation().modelVersion()); verify(classifier).analyze(english); verify(classifier,never()).analyze(original);
    }
    @Test void missingTranslationIsExcludedRatherThanPretendingItIsEnglish() throws Exception {
        var classifier=mock(ClassifierService.class); var translator=mock(ReviewTranslationService.class);
        when(translator.translate(anyString(),anyString())).thenThrow(new java.io.IOException("offline"));
        when(translator.version()).thenReturn("pinned");
        var result=new ReviewAnalysisService(classifier,translator).analyze(new Dto.ReviewIn(1,"Bonjour","fr",4,null));
        assertTrue(result.needsReview()); assertTrue(result.aspects().isEmpty()); assertEquals("failed",result.translation().status()); assertNull(result.translation().translatedText()); verifyNoInteractions(classifier);
    }
}
