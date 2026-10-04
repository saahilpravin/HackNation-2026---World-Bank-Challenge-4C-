package com.lauda.api.service;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import com.sun.net.httpserver.HttpServer;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.InetSocketAddress;
import java.nio.file.Path;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
class ReviewTranslationServiceTest {
    @TempDir Path temporary;
    @Test void realHttpContractCachesTranslationsAcrossRestarts() throws Exception {
        var server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0); var calls=new AtomicInteger();
        String version="facebook/nllb-200-distilled-600M@f8d333a098d19b4fd9a8b18f94170487ad3f821d";
        server.createContext("/translate",e -> { calls.incrementAndGet(); var body=new ObjectMapper().readTree(e.getRequestBody()); assertEquals("en",body.path("to").asText()); assertEquals("fr",body.path("from").asText()); assertEquals("http://localhost:8087",e.getRequestHeaders().getFirst("Origin")); var bytes=new ObjectMapper().writeValueAsBytes(Map.of("text","Our guide was excellent.","modelVersion",version,"source","local-laptop-model")); e.sendResponseHeaders(200,bytes.length); e.getResponseBody().write(bytes); e.close(); }); server.start();
        String endpoint="http://127.0.0.1:"+server.getAddress().getPort(); String path=temporary.resolve("cache.json").toString();
        try { var service=new ReviewTranslationService(endpoint,path); assertEquals("Our guide was excellent.",service.translate("Notre guide était excellent.","fr").text()); assertEquals(version,service.translate("Notre guide était excellent.","fr").modelVersion()); assertEquals(1,calls.get()); }
        finally { server.stop(0); }
        var restored=new ReviewTranslationService(endpoint,path); assertEquals("Our guide was excellent.",restored.translate("Notre guide était excellent.","fr").text());
        assertThrows(Exception.class,() -> restored.translate("Changed review", "fr"));
    }
    @Test void refusesCloudEndpointsAndUnknownSourceLanguage() throws Exception {
        assertThrows(IllegalArgumentException.class,() -> new ReviewTranslationService("https://external.example",temporary.resolve("cache").toString()));
        var service=new ReviewTranslationService("http://127.0.0.1:1",temporary.resolve("cache").toString());
        assertThrows(IllegalArgumentException.class,() -> service.translate("Hello","unknown"));
    }
}
