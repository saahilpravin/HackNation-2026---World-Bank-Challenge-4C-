package com.lauda.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Path;
import java.util.*;

/** Matches an evidence sentence to the closest issue in issues.json (cosine similarity). */
@Service
public class IssueMatcher {

    private record Issue(String id, List<float[]> vectors) {}

    private final ClassifierService classifier;
    private final Map<String, List<Issue>> catalog = new HashMap<>();

    @Value("${model.dir:../ml/artifacts}") private String modelDir;
    @Value("${issue.threshold:0.55}") private double threshold;

    public IssueMatcher(ClassifierService classifier) { this.classifier = classifier; }

    @PostConstruct
    void load() throws Exception {
        File f = Path.of(modelDir).resolve("issues.json").toFile();
        if (!f.exists() || !classifier.ready()) {
            System.err.println("WARNING: issue catalog or model missing; all issues will be 'unspecified'.");
            return;
        }
        JsonNode root = new ObjectMapper().readTree(f);
        for (Map.Entry<String, JsonNode> label : root.properties()) {
            List<Issue> issues = new ArrayList<>();
            for (JsonNode item : label.getValue()) {
                List<float[]> vecs = new ArrayList<>();
                for (JsonNode ex : item.get("examples")) vecs.add(classifier.embedText(ex.asText()));
                issues.add(new Issue(item.get("id").asText(), vecs));
            }
            catalog.put(label.getKey(), issues);
        }
    }

    public String match(String label, String sentence) throws Exception {
        List<Issue> issues = catalog.get(label);
        if (issues == null || sentence == null || sentence.isBlank()) return "unspecified";
        float[] e = classifier.embedText(sentence);
        String best = "unspecified";
        double bestSim = threshold;
        for (Issue issue : issues) {
            for (float[] v : issue.vectors()) {
                double sim = 0;
                for (int k = 0; k < e.length; k++) sim += e[k] * v[k];   // both L2-normalised
                if (sim >= bestSim) { bestSim = sim; best = issue.id(); }
            }
        }
        return best;
    }
}