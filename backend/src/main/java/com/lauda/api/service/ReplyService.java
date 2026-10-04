package com.lauda.api.service;

import com.lauda.api.dto.Dto;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
public class ReplyService {
    private final ClassifierService classifier;
    private final Texts texts;

    public ReplyService(ClassifierService classifier, Texts texts) {
        this.classifier = classifier;
        this.texts = texts;
    }

    public Dto.ReplyResponse draft(Dto.ReplyRequest req) throws Exception {
        Dto.ReviewIn rv = req.review();
        Dto.Analysis a = classifier.analyze(rv);
        List<String> warnings = new ArrayList<>();

        String lang = texts.canReply(rv.language()) ? rv.language() : "en";
        if (rv.language() != null && !lang.equals(rv.language()))
            warnings.add("No reply templates for '" + rv.language()
                    + "'. The draft is in English: translate it or write your own.");
        if (a.needsReview())
            warnings.add("The tags for this review are uncertain, so the drafts are generic. "
                    + "Read the review before replying.");

        String owner = req.ownerLanguage();
        boolean preview = owner != null && !owner.equals(lang) && texts.canReply(owner);

        List<Dto.Draft> drafts = new ArrayList<>();
        for (String[] v : new String[][]{{"short", "Short"}, {"detailed", "Detailed"}}) {
            boolean detailed = v[0].equals("detailed");
            drafts.add(new Dto.Draft(v[0], v[1], lang,
                    compose(lang, a, detailed, req.businessName()),
                    preview ? compose(owner, a, detailed, req.businessName()) : null));
        }
        return new Dto.ReplyResponse(rv.id(), a, drafts, warnings, true, a.modelVersion());
    }

    private String compose(String lang, Dto.Analysis a, boolean detailed, String business) {
        String tone = a.overallSentiment().equals("unknown") ? "neutral" : a.overallSentiment();
        String opening = texts.get(lang, "reply", "opening", tone);
        if (opening == null) opening = texts.get(lang, "reply", "opening", "neutral");

        List<String> parts = new ArrayList<>();
        parts.add(opening);

        if (detailed && !a.needsReview()) {
            boolean negFirst = !tone.equals("positive");
            a.aspects().stream()
                .sorted(Comparator
                    .comparing((Dto.AspectHit h) -> h.sentiment().equals("negative") == negFirst ? 0 : 1)
                    .thenComparing(h -> -h.score()))
                .limit(2)
                .forEach(h -> {
                    String line = texts.get(lang, "reply", "aspect",
                            h.aspect() + (h.sentiment().equals("positive") ? "+" : "-"));
                    if (line != null) parts.add(line);        // missing line -> skipped, never mixed language
                });
        }

        String closeKey = (tone.equals("negative") || tone.equals("mixed")) ? "negative" : "positive";
        String closing = texts.get(lang, "reply", "closing", closeKey);
        if (closing != null) parts.add(closing);

        String body = String.join(" ", parts);
        return (business == null || business.isBlank()) ? body : body + "\n\n" + business;
    }
}