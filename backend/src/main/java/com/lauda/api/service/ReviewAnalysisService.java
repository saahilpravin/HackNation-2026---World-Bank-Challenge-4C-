package com.lauda.api.service;
import com.lauda.api.dto.Dto;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ReviewAnalysisService {
    private final ClassifierService classifier;
    private final ReviewTranslationService translator;
    public ReviewAnalysisService(ClassifierService classifier, ReviewTranslationService translator) { this.classifier=classifier; this.translator=translator; }
    public String pipelineVersion() { return classifier.modelVersion()+"/"+translator.version(); }
    public Dto.Analysis analyze(Dto.ReviewIn original) throws Exception {
        if ("en".equals(original.language()) || "eng_Latn".equals(original.language())) return classifier.analyze(new Dto.ReviewIn(original.id(),original.text(),"en",original.rating(),original.date()));
        ReviewTranslationService.Output output;
        try { output=translator.translate(original.text(),original.language()); }
        catch(Exception e) {
            if(e instanceof InterruptedException) Thread.currentThread().interrupt();
            String sentiment=original.rating()==null?"unknown":original.rating()>=4?"positive":original.rating()<=2?"negative":"neutral";
            String error=e instanceof IllegalArgumentException?e.getMessage():"Local NLLB translation is unavailable. Start npm run translate and retry.";
            return new Dto.Analysis(original.id(),original.language(),original.rating(),original.date(),List.of(),sentiment,true,"translation-unavailable",original.rating()==null?"unknown":"star-rating",new Dto.Translation("failed",original.language(),translator.version(),original.text(),null,error));
        }
        var analysis=classifier.analyze(new Dto.ReviewIn(original.id(),output.text(),"en",original.rating(),original.date()));
        return new Dto.Analysis(original.id(),original.language(),original.rating(),original.date(),analysis.aspects(),analysis.overallSentiment(),analysis.needsReview(),analysis.modelVersion(),analysis.sentimentSource(),new Dto.Translation("translated",original.language(),output.modelVersion(),original.text(),output.text(),null));
    }
}
