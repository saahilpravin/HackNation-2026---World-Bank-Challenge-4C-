package com.lauda.api.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.http.*;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

/** Translates original review text locally; successful translations survive server restarts. */
@Service
public class ReviewTranslationService {
    private static final String VERSION = "facebook/nllb-200-distilled-600M@f8d333a098d19b4fd9a8b18f94170487ad3f821d";
    private final ObjectMapper json = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build();
    private final String endpoint;
    private final Path cacheFile;
    private final LinkedHashMap<String, String> cache = new LinkedHashMap<>(512,.75f,true);
    private long unavailableUntil;
    public record Output(String text, String modelVersion) {}
    public ReviewTranslationService(@Value("${lauda.translation.endpoint:http://127.0.0.1:8085}") String endpoint,
            @Value("${lauda.translation.cache:.ai-cache/insight-translations.json}") String path) throws Exception {
        var uri = URI.create(endpoint);
        if (!"http".equals(uri.getScheme()) || !Set.of("127.0.0.1","localhost","[::1]").contains(uri.getHost()) || uri.getUserInfo()!=null || uri.getQuery()!=null || uri.getFragment()!=null || (uri.getPath()!=null && !uri.getPath().isEmpty())) throw new IllegalArgumentException("Translation endpoint must be a loopback origin");
        this.endpoint=endpoint; this.cacheFile=Path.of(path);
        if (Files.exists(cacheFile) && Files.size(cacheFile) <= 12000000) {
            try { var root=json.readTree(cacheFile.toFile()); if (VERSION.equals(root.path("model_version").asText())) root.path("entries").fields().forEachRemaining(e -> { if(e.getKey().matches("[a-f0-9]{64}") && e.getValue().isTextual() && !e.getValue().asText().isBlank() && e.getValue().asText().length()<=12000 && cache.size()<500) cache.put(e.getKey(),e.getValue().asText()); }); }
            catch(java.io.IOException ignored) { /* Corrupt cache is recomputed, never treated as translation. */ }
        }
    }
    public String version() { return VERSION; }
    public synchronized Output translate(String text, String language) throws Exception {
        if (language==null || language.isBlank() || language.equals("unknown")) throw new IllegalArgumentException("Source language is unknown; select its language before analysis.");
        String key=HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest((VERSION+"\n"+language+"\n"+text).getBytes(StandardCharsets.UTF_8)));
        if(cache.containsKey(key)) return new Output(cache.get(key),VERSION);
        if(System.currentTimeMillis()<unavailableUntil) throw new java.io.IOException("NLLB unavailable");
        try {
            String body=json.writeValueAsString(Map.of("text",text,"from",language,"to","en"));
            HttpResponse<String> response=null;
            for(int attempt=0;attempt<3;attempt++) {
                response=http.send(HttpRequest.newBuilder(URI.create(endpoint+"/translate")).timeout(Duration.ofSeconds(90)).header("Content-Type","application/json").header("Origin","http://localhost:8087").POST(HttpRequest.BodyPublishers.ofString(body)).build(),HttpResponse.BodyHandlers.ofString());
                if(response.statusCode()!=503) break;
                Thread.sleep(500);
            }
            if(response.statusCode()!=200 || response.body().length()>100000) throw new IllegalArgumentException("NLLB could not translate this review. Check source language and service readiness.");
            var result=json.readTree(response.body());
            if(!VERSION.equals(result.path("modelVersion").asText()) || !"local-laptop-model".equals(result.path("source").asText()) || !result.path("text").isTextual() || result.path("text").asText().isBlank() || result.path("text").asText().length()>12000) throw new IllegalArgumentException("Translation did not pass provenance checks.");
            String translated=result.path("text").asText(); cache.put(key,translated);
            while(cache.size()>500) cache.remove(cache.keySet().iterator().next());
            persist(); return new Output(translated,VERSION);
        } catch(java.io.IOException e) { unavailableUntil=System.currentTimeMillis()+10000; throw e; }
    }
    private void persist() throws Exception {
        Path parent=cacheFile.toAbsolutePath().getParent(); Files.createDirectories(parent);
        Path temp=Files.createTempFile(parent,"translations-",".tmp");
        try { json.writeValue(temp.toFile(),Map.of("model_version",VERSION,"entries",cache));
            try { Files.setPosixFilePermissions(temp,java.nio.file.attribute.PosixFilePermissions.fromString("rw-------")); } catch(UnsupportedOperationException ignored) {}
            try { Files.move(temp,cacheFile,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING); }
            catch(AtomicMoveNotSupportedException e) { Files.move(temp,cacheFile,StandardCopyOption.REPLACE_EXISTING); }
        } finally { Files.deleteIfExists(temp); }
    }
}
