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
    private static final String PROMPT_VERSION = "insights-v2-overview";
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
            // Rank all counted aspects, not just the shortened qualitative cards. Numerical
            // facts are rendered by the server so the small model cannot invent a score.
            List<String> positive = rankedLabels(base, true, findings);
            List<String> negative = rankedLabels(base, false, findings);
            Map<String, Object> context = Map.of("positive_themes_in_frequency_order", positive,
                    "negative_themes_in_frequency_order", negative);
            String content = json.writeValueAsString(context);
            String key = base.meta().modelVersion() + digest + PROMPT_VERSION + base.meta().ownerLanguage() + json.writeValueAsString(Arrays.asList(base.meta(), base.quantitative(), context));
            var cached = cache.get(key); if (cached != null) return cached;
            if (!slot.tryAcquire()) return unavailable("busy", 0, "Another summary is being generated. Refresh in a moment.");
            try {
                cached = cache.get(key); if (cached != null) return cached;
                Map<String, Object> schema = Map.of("type", "object", "additionalProperties", false,
                    "required", List.of("summary"), "properties", Map.of("summary",
                    Map.of("type", "string", "minLength", 60, "maxLength", 650)));
                String body = json.writeValueAsString(Map.of("model", model, "stream", false, "think", false, "format", schema, "keep_alive", "5m", "options", Map.of("temperature", 0, "num_ctx", 4096, "num_predict", 280), "messages", List.of(Map.of("role", "system", "content", prompt), Map.of("role", "user", "content", content))));
                var response = client.send(HttpRequest.newBuilder(URI.create(endpoint + "/api/chat")).timeout(Duration.ofSeconds(timeout)).header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(), HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200 || response.body().length() > 100000) throw new IllegalStateException("Invalid model response");
                JsonNode output = json.readTree(json.readTree(response.body()).path("message").path("content").asText());
                String generated = validateSummary(output, positive, negative);
                String scope = "Across " + base.meta().total() + " reviews, " + base.meta().analysed()
                    + " have usable aspect findings and " + base.meta().unread() + " need checking. ";
                if (base.quantitative()!=null && base.quantitative().averageRating()!=null)
                    scope += "The average review rating is " + String.format(Locale.ROOT,"%.1f",base.quantitative().averageRating()) + "/5. ";
                Dto.Narrative result = new Dto.Narrative("generated", "local-laptop-llm", model,
                    expectedDigest, PROMPT_VERSION, elapsed(start), scope + generated, List.of(),
                    List.of("English overview of classified themes. Verify against the original reviews; model tags and wording can be inaccurate."));
                cache.put(key, result); return result;
            } finally { slot.release(); }
        } catch (HttpTimeoutException e) { return unavailable("timeout", elapsed(start), "Local summary timed out. Your counted findings are still available."); }
        catch (com.fasterxml.jackson.core.JsonProcessingException e) { return unavailable("invalid-output", elapsed(start), "Generated text was not valid structured output. Counted findings are unchanged."); }
        catch (java.io.IOException e) { return unavailable("not-ready", elapsed(start), "Start the local Ollama service. Saved findings are still available."); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); return unavailable("not-ready", elapsed(start), "Summary interrupted."); }
        catch (Exception e) { return unavailable("invalid-output", elapsed(start), "The local model or its output did not pass validation. Counted findings are unchanged."); }
    }
    private List<String> rankedLabels(Dto.InsightsResponse base, boolean positive, List<Dto.Finding> findings) {
        if (base.quantitative() != null) return base.quantitative().aspects().stream()
            .filter(a -> (positive ? a.positive() : a.negative()) > 0)
            .sorted(Comparator.<Dto.AspectStat>comparingInt(a -> positive ? a.positive() : a.negative()).reversed().thenComparing(Dto.AspectStat::aspect))
            .map(a -> englishLabel(a.aspect(),a.label())).toList();
        return findings.stream().filter(f -> (positive ? base.qualitative().strengths() : base.qualitative().problems()).contains(f))
            .sorted(Comparator.comparingInt(Dto.Finding::count).reversed()).map(f -> englishLabel(f.aspect(),f.label())).distinct().toList();
    }
    private String englishLabel(String aspect, String fallback) {
        return Map.of("guide","Tour guide","price_value","Value for money","communication","Communication",
            "facilities","Facilities","access_transport","Getting there","food","Food and refreshments","other","Other").getOrDefault(aspect,fallback);
    }
    String validateSummary(JsonNode output, List<String> positive, List<String> negative) {
        if (!output.isObject() || output.size() != 1 || !output.path("summary").isTextual()) throw new IllegalArgumentException("Invalid overview structure");
        String summary=output.path("summary").asText().strip();
        if(summary.length()<60 || summary.length()>650 || summary.matches("(?s).*[\\d\\r\\n].*")
                || summary.contains("`") || summary.contains("http") || summary.contains("#")) throw new IllegalArgumentException("Invalid overview text");
        String lower=summary.toLowerCase(Locale.ROOT);
        if(!positive.isEmpty() && !lower.contains(positive.get(0).toLowerCase(Locale.ROOT))) throw new IllegalArgumentException("Missing leading praise theme");
        if(!negative.isEmpty() && !lower.contains(negative.get(0).toLowerCase(Locale.ROOT))) throw new IllegalArgumentException("Missing leading concern theme");
        if(positive.isEmpty() && (lower.contains("praise") || lower.contains("positive themes include"))) throw new IllegalArgumentException("Unsupported praise");
        if(negative.isEmpty() && lower.contains("negative themes include")) throw new IllegalArgumentException("Unsupported concern");
        return summary;
    }
    private static long elapsed(long start) { return (System.nanoTime() - start) / 1000000; }
}
