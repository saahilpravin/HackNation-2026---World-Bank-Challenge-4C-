package com.lauda.api.service;

import ai.djl.huggingface.tokenizers.Encoding;
import ai.djl.huggingface.tokenizers.HuggingFaceTokenizer;
import ai.onnxruntime.OnnxTensor;
import ai.onnxruntime.OrtEnvironment;
import ai.onnxruntime.OrtException;
import ai.onnxruntime.OrtSession;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lauda.api.dto.Dto;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.file.Path;
import java.text.Normalizer;
import java.text.BreakIterator;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ClassifierService {

    @Value("${model.dir:../ml/artifacts}")
    private String modelDir;

    // ONNX encoder + tokenizer
    private OrtEnvironment env;
    private OrtSession session;
    private HuggingFaceTokenizer tokenizer;

    // Trained head (loaded from head_v1.json)
    private String[] labels;
    private double[][] w;       // [label][embedding dimension]
    private double[] b;         // one bias per label
    private double[] thr;       // one threshold per label
    private String prefix;      // "" or "query: " depending on the encoder
    private String version;
    private int minChars;
    private final Set<String> testedLangs = new HashSet<>();

    // ---------- 1. Startup: load everything once ----------

    @PostConstruct
    void load() throws Exception {
        Path dir = Path.of(modelDir);
        JsonNode h = new ObjectMapper().readTree(dir.resolve("head_v1.json").toFile());

        version = h.get("version").asText();
        prefix = h.get("prefix").asText();
        minChars = h.get("min_chars").asInt();
        h.get("tested_langs").forEach(n -> testedLangs.add(n.asText()));

        int n = h.get("labels").size();
        int d = h.get("W").get(0).size();
        labels = new String[n];
        w = new double[n][d];
        b = new double[n];
        thr = new double[n];
        for (int j = 0; j < n; j++) {
            labels[j] = h.get("labels").get(j).asText();
            b[j] = h.get("b").get(j).asDouble();
            thr[j] = h.get("thresholds").get(j).asDouble();
            for (int k = 0; k < d; k++) {
                w[j][k] = h.get("W").get(j).get(k).asDouble();
            }
        }

        env = OrtEnvironment.getEnvironment();
        session = env.createSession(
                dir.resolve("encoder/model.onnx").toString(),
                new OrtSession.SessionOptions());
        tokenizer = HuggingFaceTokenizer.builder()
                .optTokenizerPath(dir.resolve("encoder/tokenizer.json"))
                .optTruncation(true)
                .optMaxLength(h.get("max_len").asInt())
                .build();
    }

    @PreDestroy
    void close() throws OrtException {
        if (session != null) session.close();
        if (tokenizer != null) tokenizer.close();
    }

    // ---------- 2. Text normalization (must mirror Python's normalize()) ----------

    static String normalize(String s) {
        String t = Normalizer.normalize(s == null ? "" : s, Normalizer.Form.NFKC);
        return t.replaceAll("(?U)\\s+", " ").strip();
    }

    // ---------- 3. Encoder: text -> 384-number vector ----------

    private float[] embed(String text) throws OrtException {
        Encoding enc = tokenizer.encode(prefix + text);
        long[] ids = enc.getIds();
        long[] mask = enc.getAttentionMask();

        Map<String, OnnxTensor> in = new HashMap<>();
        try {
            in.put("input_ids", OnnxTensor.createTensor(env, new long[][]{ids}));
            in.put("attention_mask", OnnxTensor.createTensor(env, new long[][]{mask}));
            if (session.getInputNames().contains("token_type_ids")) {
                in.put("token_type_ids",
                        OnnxTensor.createTensor(env, new long[][]{new long[ids.length]}));
            }

            try (OrtSession.Result r = session.run(in)) {
                float[][] hidden = ((float[][][]) r.get(0).getValue())[0];   // [tokens][dim]
                int dim = hidden[0].length;

                // Mean pooling over real tokens only (mask == 1)
                float[] e = new float[dim];
                double count = 0;
                for (int t = 0; t < hidden.length; t++) {
                    if (mask[t] == 0) continue;
                    count++;
                    for (int k = 0; k < dim; k++) e[k] += hidden[t][k];
                }
                double norm = 0;
                for (int k = 0; k < dim; k++) {
                    e[k] /= Math.max(count, 1e-9);
                    norm += e[k] * e[k];
                }

                // L2 normalization (same as normalize_embeddings=True in Python)
                norm = Math.max(Math.sqrt(norm), 1e-12);
                for (int k = 0; k < dim; k++) e[k] /= norm;
                return e;
            }
        } finally {
            in.values().forEach(OnnxTensor::close);   // free native memory
        }
    }

    // ---------- 4. Head: vector -> one probability per label ----------

    public double[] scores(String raw) throws OrtException {
        float[] e = embed(normalize(raw));
        double[] p = new double[labels.length];
        for (int j = 0; j < labels.length; j++) {
            double z = b[j];
            for (int k = 0; k < e.length; k++) z += w[j][k] * e[k];
            p[j] = 1.0 / (1.0 + Math.exp(-z));        // sigmoid
        }
        return p;
    }

    // ---------- 5. Decision logic: scores -> API response ----------

    public Dto.AnalyzeResponse analyze(Dto.AnalyzeRequest r) throws OrtException {
        if (labels == null) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "model not loaded");
        }
        String t = normalize(r.text());
        List<Dto.AspectHit> hits = new ArrayList<>();

        if (t.codePointCount(0, t.length()) >= minChars) {
            double[] whole = scores(t);
            List<String> parts = sentences(t);
            double[][] partScores = new double[parts.size()][];
            for (int k = 0; k < parts.size(); k++) {
                partScores[k] = parts.size() == 1 ? whole : scores(parts.get(k));
            }
            for (int j = 0; j < labels.length; j++) {
                if (whole[j] < thr[j]) continue;
                int best = 0;
                for (int k = 1; k < parts.size(); k++) {
                    if (partScores[k][j] > partScores[best][j]) best = k;
                }
                String l = labels[j];
                hits.add(new Dto.AspectHit(
                        l.substring(0, l.length() - 1),
                        l.endsWith("+") ? "positive" : "negative",
                        Math.round(whole[j] * 100) / 100.0,
                        parts.get(best), "unspecified"));
            }
        }

        boolean pos = hits.stream().anyMatch(a -> a.sentiment().equals("positive"));
        boolean neg = hits.stream().anyMatch(a -> a.sentiment().equals("negative"));
        String overall;
        if (pos || neg) overall = pos && neg ? "mixed" : pos ? "positive" : "negative";
        else if (r.rating() != null) overall = r.rating() >= 4 ? "positive" : r.rating() <= 2 ? "negative" : "neutral";
        else overall = "unknown";

        boolean untested = r.language() != null && !testedLangs.contains(r.language());
        return new Dto.AnalyzeResponse(r.id(), r.language(), r.rating(), hits, overall,
                hits.isEmpty() || untested, version);
    }

    public boolean ready() { return labels != null; }

    /** Embedding for any raw text (used by IssueMatcher). */
    public float[] embedText(String raw) throws OrtException {
        return embed(normalize(raw));
    }

    /** Splits a review into sentences, then into clauses at "but"-type words. */
    static List<String> sentences(String t) {
        BreakIterator bi = BreakIterator.getSentenceInstance(Locale.ROOT);
        bi.setText(t);
        List<String> out = new ArrayList<>();
        for (int s = bi.first(), e = bi.next(); e != BreakIterator.DONE; s = e, e = bi.next()) {
            for (String clause : t.substring(s, e).strip()
                    .split("(?iu),?\\s+\\b(but|however|although|lakini|ingawa|ila|mais|pero|aber)\\b\\s+")) {
                String x = clause.strip();
                if (x.codePointCount(0, x.length()) >= 4) out.add(x);
            }
        }
        if (out.isEmpty()) out.add(t);
        return out;
    }
}