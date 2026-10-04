package com.lauda.api.service;

import com.fasterxml.jackson.databind.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.nio.file.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Bounded, versioned local results. Runtime data never belongs in Git. */
@Service
public class LocalOutputCache {
    private final ObjectMapper json = new ObjectMapper();
    private final Path file;
    private final LinkedHashMap<String,JsonNode> entries = new LinkedHashMap<>(256,.75f,true);
    public LocalOutputCache(@Value("${lauda.output.cache:.ai-cache/generated-results.json}") String path) {
        file=Path.of(path);
        try { if(Files.exists(file) && Files.size(file)<16000000) {
            var root=json.readTree(file.toFile());
            if(root.path("schema").asInt()==1) root.path("entries").fields().forEachRemaining(e -> {
                if(e.getKey().matches("[a-f0-9]{64}") && entries.size()<256 && e.getValue().isObject()) entries.put(e.getKey(),e.getValue());
            });
        }} catch(Exception ignored) { /* Recompute a corrupt cache. */ }
    }
    public static String key(String value) {
        try { return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(Exception e) { throw new IllegalStateException(e); }
    }
    public synchronized <T> T get(String key, Class<T> type) {
        try { var value=entries.get(key); return value==null?null:json.treeToValue(value,type); }
        catch(Exception e) { entries.remove(key); return null; }
    }
    public synchronized void put(String key,Object value) {
        entries.put(key,json.valueToTree(value)); while(entries.size()>256) entries.remove(entries.keySet().iterator().next());
        Path temp=null;
        try {
            Path parent=file.toAbsolutePath().getParent(); Files.createDirectories(parent); temp=Files.createTempFile(parent,"outputs-",".tmp");
            json.writeValue(temp.toFile(),Map.of("schema",1,"entries",entries));
            while(Files.size(temp)>15000000 && entries.size()>1) { entries.remove(entries.keySet().iterator().next()); json.writeValue(temp.toFile(),Map.of("schema",1,"entries",entries)); }
            try { Files.setPosixFilePermissions(temp,java.nio.file.attribute.PosixFilePermissions.fromString("rw-------")); } catch(UnsupportedOperationException ignored) {}
            try { Files.move(temp,file.toAbsolutePath(),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING); }
            catch(AtomicMoveNotSupportedException e) { Files.move(temp,file.toAbsolutePath(),StandardCopyOption.REPLACE_EXISTING); }
        } catch(Exception ignored) { /* Keep usable results in memory if disk is unavailable. */ }
        finally { if(temp!=null) try { Files.deleteIfExists(temp); } catch(Exception ignored) {} }
    }
}
