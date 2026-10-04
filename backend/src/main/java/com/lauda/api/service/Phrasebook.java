package com.lauda.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Path;

/** Human-written, human-reviewed text in the owner's language. Nothing here is generated. */
@Service
public class Phrasebook {
    @Value("${model.dir:../ml/artifacts}") private String modelDir;
    private JsonNode root;

    @PostConstruct
    void load() throws Exception {
        File f = Path.of(modelDir).resolve("phrasebook.json").toFile();
        root = f.exists() ? new ObjectMapper().readTree(f) : null;
    }

    public boolean has(String lang) { return root != null && lang != null && root.has(lang); }
    public String resolve(String lang) { return has(lang) ? lang : "en"; }

    private String get(String lang, String... path) {
        if (root == null) return null;
        JsonNode n = root.path(lang);
        for (String p : path) n = n.path(p);
        return n.isMissingNode() || n.isNull() ? null : n.asText();
    }

    public String template(String lang, String key) {
        String t = get(lang, "templates", key);
        return t != null ? t : get("en", "templates", key);
    }

    public String levelLabel(String lang, String level) {
        String t = get(lang, "levels", level);
        return t != null ? t : get("en", "levels", level);
    }

    /** Tries owner language then English; exact issue then 'unspecified'. */
    public String title(String lang, String label, String issue) { return lookup(lang, label, issue, "title"); }
    public String action(String lang, String label, String issue) { return lookup(lang, label, issue, "action"); }

    private String lookup(String lang, String label, String issue, String field) {
        for (String l : new String[]{lang, "en"})
            for (String i : new String[]{issue, "unspecified"}) {
                String v = get(l, "issues", label + ":" + i, field);
                if (v != null) return v;
            }
        return field.equals("title") ? label : null;
    }
}