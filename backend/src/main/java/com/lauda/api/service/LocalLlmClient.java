package com.lauda.api.service;

import com.fasterxml.jackson.databind.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

/** One local model, shared by narration and replies. Never downloads on inference. */
@Service
public class LocalLlmClient {
    public final boolean enabled;
    public final String model,digest;
    private final String endpoint;
    private final int timeout;
    private final ObjectMapper json=new ObjectMapper();
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    private final Semaphore slot=new Semaphore(1,true);
    private final Semaphore pending=new Semaphore(4,true);
    public static class BusyException extends Exception {}
    public LocalLlmClient(@Value("${lauda.llm.enabled:false}") boolean enabled,
        @Value("${lauda.llm.endpoint:http://127.0.0.1:11434}") String endpoint,
        @Value("${lauda.llm.model:qwen3:4b}") String model,
        @Value("${lauda.llm.digest:359d7dd4bcdab3d86b87d73ac27966f4dbb9f5efdfcc75d34a8764a09474fae7}") String digest,
        @Value("${lauda.llm.timeout-seconds:25}") int timeout) {
        URI uri=URI.create(endpoint);
        if(!"http".equals(uri.getScheme()) || !Set.of("127.0.0.1","localhost","[::1]").contains(uri.getHost()) || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null || (uri.getPath()!=null && !uri.getPath().isEmpty())) throw new IllegalArgumentException("LLM endpoint must be a loopback origin");
        this.enabled=enabled; this.endpoint=endpoint; this.model=model; this.digest=digest; this.timeout=Math.max(1,Math.min(timeout,90));
    }
    public void verify() throws Exception {
        var response=http.send(HttpRequest.newBuilder(URI.create(endpoint+"/api/tags")).timeout(Duration.ofSeconds(2)).GET().build(),HttpResponse.BodyHandlers.ofString());
        if(response.statusCode()!=200 || response.body().length()>200000) throw new java.io.IOException("Ollama unavailable");
        for(var node:json.readTree(response.body()).path("models")) if(model.equals(node.path("name").asText()) && digest.equals(node.path("digest").asText())) return;
        throw new java.io.IOException("Pinned Qwen model is not installed");
    }
    public Map<String,Object> capabilities() {
        boolean ready=false; if(enabled) try { verify(); ready=true; } catch(Exception ignored) {}
        return Map.of("enabled",enabled,"ready",ready,"model",model,"digest",digest,"execution","local-laptop","tasks",List.of("insights","reply-drafts"));
    }
    public JsonNode generate(String prompt,Object context,Object schema,int tokens) throws Exception {
        if(!enabled) throw new java.io.IOException("Local generation disabled");
        if(!pending.tryAcquire()) throw new BusyException();
        boolean active=false;
        try {
            active=slot.tryAcquire(10,TimeUnit.SECONDS);
            if(!active) throw new BusyException();
            verify();
            String content=json.writeValueAsString(context); if(content.length()>18000) throw new IllegalArgumentException("Model context too large");
            String body=json.writeValueAsString(Map.of("model",model,"stream",false,"think",false,"format",schema,"keep_alive","5m","options",Map.of("temperature",0,"num_ctx",4096,"num_predict",tokens),"messages",List.of(Map.of("role","system","content",prompt),Map.of("role","user","content",content))));
            var response=http.send(HttpRequest.newBuilder(URI.create(endpoint+"/api/chat")).timeout(Duration.ofSeconds(timeout)).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()!=200 || response.body().length()>100000) throw new java.io.IOException("Local generation unavailable");
            return json.readTree(json.readTree(response.body()).path("message").path("content").asText());
        } finally { if(active) slot.release(); pending.release(); }
    }
}
