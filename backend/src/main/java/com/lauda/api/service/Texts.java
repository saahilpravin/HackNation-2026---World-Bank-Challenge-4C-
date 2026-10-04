package com.lauda.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.MissingNode;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Path;

/** Human-written text in each language. Nothing here is generated. */
@Service
public class Texts {
    @Value("${model.dir:../ml/artifacts}") private String modelDir;
    private JsonNode root = MissingNode.getInstance();

    @PostConstruct
    void load() throws Exception {
        File f = Path.of(modelDir).resolve("texts.json").toFile();
        if (f.exists()) root = new ObjectMapper().readTree(f);
        else throw new IllegalStateException("Required texts.json not found in " + f.getParent());
        if (!hasInsights("en") || !canReply("en")) throw new IllegalStateException("texts.json needs English insight and reply fallback templates");
    }

    /** Exact lookup in one language; null if missing. */
    public String get(String lang, String... path) {
        JsonNode n = root.path(lang == null ? "" : lang);
        for (String p : path) n = n.path(p);
        return n.isTextual() ? n.asText() : null;
    }

    /** Owner-facing text: falls back to English per key. */
    public String getOrEn(String lang, String... path) {
        String v = get(lang, path);
        return v != null ? v : get("en", path);
    }

    public boolean canReply(String lang) { return get(lang, "reply", "opening", "neutral") != null; }
    public boolean hasInsights(String lang) { return get(lang, "insights", "problem") != null; }
}