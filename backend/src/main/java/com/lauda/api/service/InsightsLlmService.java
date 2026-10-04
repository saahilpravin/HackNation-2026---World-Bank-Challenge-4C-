package com.lauda.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lauda.api.dto.Dto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.Semaphore;

/** Optional local narration. Counts, evidence and classifier decisions remain authoritative. */
@Service
public class InsightsLlmService {
    private static final String PROMPT_VERSION = "insights-v1";
    private final ObjectMapper json = new ObjectMapper();
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    private final Semaphore slot = new Semaphore(1);
    private final Map<String, Dto.Narrative> cache = Collections.synchronizedMap(new LinkedHashMap<>(32, .75f, true) {
        protected boolean removeEldestEntry(Map.Entry<String, Dto.Narrative> e) { return size() > 32; }
    });
    private final boolean enabled;
    private final String endpoint, model, expectedDigest, prompt;
    private final int timeout;

    public InsightsLlmService(@Value("${lauda.llm.enabled:false}") boolean enabled,
            @Value("${lauda.llm.endpoint:http://127.0.0.1:11434}") String endpoint,
            @Value("${lauda.llm.model:qwen3:0.6b}") String model,
            @Value("${lauda.llm.digest:7df6b6e09427a769808717c0a93cadc4ae99ed4eb8bf5ca557c90846becea435}") String digest,
            @Value("${lauda.llm.timeout-seconds:25}") int timeout) throws Exception {
        URI uri = URI.create(endpoint);
        if (!"http".equals(uri.getScheme()) || !Set.of("127.0.0.1", "localhost", "[::1]").contains(uri.getHost())
                || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                || (uri.getPath() != null && !uri.getPath().isEmpty())) throw new IllegalArgumentException("LLM endpoint must be a loopback origin");
        this.enabled = enabled; this.endpoint = endpoint; this.model = model; this.expectedDigest = digest;
        this.timeout = Math.max(1, Math.min(timeout, 90));
        try (var stream = getClass().getResourceAsStream("/prompts/insights-system.txt")) {
            if (stream == null) throw new IllegalStateException("Missing LLM prompt");
            this.prompt = new String(stream.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        }
    }
    private Dto.Narrative unavailable(String status, long ms, String warning) {
        return new Dto.Narrative(status, "local-laptop-llm", model, expectedDigest, PROMPT_VERSION, ms, null, List.of(), List.of(warning));
    }
    private String installedDigest() throws Exception {
        var response = client.send(HttpRequest.newBuilder(URI.create(endpoint + "/api/tags")).timeout(Duration.ofSeconds(2)).GET().build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200 || response.body().length() > 200000) throw new IllegalStateException();
        for (JsonNode node : json.readTree(response.body()).path("models"))
            if (model.equals(node.path("name").asText()) && expectedDigest.equals(node.path("digest").asText())) return expectedDigest;
        throw new IllegalStateException("Pinned model is not installed");
    }
    public Map<String, Object> capabilities() {
        boolean ready = false;
        if (enabled) { try { installedDigest(); ready = true; } catch (Exception ignored) {} }
        return Map.of("enabled", enabled, "ready", ready, "model", model, "digest", expectedDigest, "prompt_version", PROMPT_VERSION, "execution", "local-laptop");
    }
    public Dto.Narrative summarize(Dto.InsightsResponse base) {
        long start = System.nanoTime();
        if (!enabled) return unavailable("disabled", 0, "Enable LAUDA_LLM_ENABLED after installing the pinned local model.");
        List<Dto.Finding> findings = new ArrayList<>();
        findings.addAll(base.qualitative().strengths().stream().limit(3).toList());
        findings.addAll(base.qualitative().problems().stream().limit(3).toList());
        if (base.meta().analysed() == 0 || findings.isEmpty()) return unavailable("insufficient-evidence", 0, "No eligible aspect evidence to summarize.");
        try {
            String digest = installedDigest();
            List<Map<String, Object>> context = new ArrayList<>();
            for (Dto.Finding f : findings) {
                String polarity = base.qualitative().strengths().contains(f) ? "positive" : "negative";
                context.add(Map.of("aspect", f.aspect(), "label", f.label(), "polarity", polarity, "count", f.count(), "review_ids", f.quotes().stream().limit(2).map(Dto.Quote::reviewId).toList(),
                    "quotes", f.quotes().stream().limit(2).map(q -> q.text().substring(0, Math.min(q.text().length(), 300))).toList()));
            }
            String content = json.writeValueAsString(Map.of("analysed", base.meta().analysed(), "excluded", base.meta().unread(), "findings", context));
            String key = base.meta().modelVersion() + digest + PROMPT_VERSION + base.meta().ownerLanguage() + content;
            var cached = cache.get(key); if (cached != null) return cached;
            if (!slot.tryAcquire()) return unavailable("busy", 0, "Another summary is being generated. Refresh in a moment.");
            try {
                cached = cache.get(key); if (cached != null) return cached;
                Map<String, Object> schema = Map.of("type", "object", "additionalProperties", false, "required", List.of("summary", "aspect_notes"), "properties", Map.of(
                    "summary", Map.of("type", "string", "maxLength", 900), "aspect_notes", Map.of("type", "array", "maxItems", 4, "items", Map.of("type", "object", "additionalProperties", false, "required", List.of("aspect", "polarity", "text", "review_ids"), "properties", Map.of(
                        "aspect", Map.of("type", "string"), "polarity", Map.of("type", "string", "enum", List.of("positive", "negative")), "text", Map.of("type", "string", "enum", context.stream().flatMap(c -> ((List<?>)c.get("quotes")).stream()).distinct().toList()), "review_ids", Map.of("type", "array", "minItems", 1, "maxItems", 1, "items", Map.of("type", "integer")))))));
                String body = json.writeValueAsString(Map.of("model", model, "stream", false, "think", false, "format", schema, "keep_alive", "5m", "options", Map.of("temperature", 0, "num_ctx", 4096, "num_predict", 500), "messages", List.of(Map.of("role", "system", "content", prompt), Map.of("role", "user", "content", content))));
                var response = client.send(HttpRequest.newBuilder(URI.create(endpoint + "/api/chat")).timeout(Duration.ofSeconds(timeout)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200 || response.body().length() > 100000) throw new IllegalStateException("Invalid model response");
                JsonNode output = json.readTree(json.readTree(response.body()).path("message").path("content").asText());
                Dto.Narrative result = validate(output, context, elapsed(start));
                cache.put(key, result); return result;
            } finally { slot.release(); }
        } catch (HttpTimeoutException e) { return unavailable("timeout", elapsed(start), "Local summary timed out. Your counted findings are still available."); }
        catch (com.fasterxml.jackson.core.JsonProcessingException e) { return unavailable("invalid-output", elapsed(start), "Generated text was not valid structured output. Counted findings are unchanged."); }
        catch (java.io.IOException e) { return unavailable("not-ready", elapsed(start), "Start the local Ollama service. Saved findings are still available."); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); return unavailable("not-ready", elapsed(start), "Summary interrupted."); }
        catch (Exception e) { return unavailable("invalid-output", elapsed(start), "The local model or its output did not pass validation. Counted findings are unchanged."); }
    }
    Dto.Narrative validate(JsonNode output, List<Map<String, Object>> context, long ms) {
        if (!output.isObject() || output.size() != 2 || !output.path("summary").isTextual() || output.path("summary").asText().isBlank() || output.path("summary").asText().length() > 900 || !output.path("aspect_notes").isArray() || output.path("aspect_notes").size() > 4) throw new IllegalArgumentException();
        List<Dto.NarrativeNote> notes = new ArrayList<>(); Set<String> seen = new HashSet<>();
        for (JsonNode n : output.path("aspect_notes")) {
            if (!n.isObject() || n.size() != 4 || !n.path("aspect").isTextual() || !n.path("polarity").isTextual() || !n.path("text").isTextual() || n.path("text").asText().isBlank() || n.path("text").asText().length() > 350 || !n.path("review_ids").isArray() || n.path("review_ids").size() != 1) throw new IllegalArgumentException();
            String aspect = n.path("aspect").asText(), polarity = n.path("polarity").asText();
            Map<String, Object> match = context.stream().filter(c -> c.get("aspect").equals(aspect) && c.get("polarity").equals(polarity)).findFirst().orElseThrow(IllegalArgumentException::new);
            if (!((List<?>)match.get("quotes")).contains(n.path("text").asText())) throw new IllegalArgumentException("Note must quote supplied evidence verbatim");
            if (!seen.add(aspect + polarity)) throw new IllegalArgumentException();
            List<Integer> ids = new ArrayList<>();
            for (JsonNode id : n.path("review_ids")) { if (!id.isIntegralNumber() || !id.canConvertToInt() || !((List<?>)match.get("review_ids")).contains(id.intValue()) || ids.contains(id.intValue())) throw new IllegalArgumentException(); if (!((List<?>)match.get("quotes")).get(((List<?>)match.get("review_ids")).indexOf(id.intValue())).equals(n.path("text").asText())) throw new IllegalArgumentException("Quote ID mismatch"); ids.add(id.intValue()); }
            notes.add(new Dto.NarrativeNote(aspect, polarity, n.path("text").asText(), ids));
        }
        return new Dto.Narrative("generated", "local-laptop-llm", model, expectedDigest, PROMPT_VERSION, ms, output.path("summary").asText(), notes, List.of("English summary; verify against the original reviews. Generated wording can still be inaccurate."));
    }
    private static long elapsed(long start) { return (System.nanoTime() - start) / 1000000; }
}
