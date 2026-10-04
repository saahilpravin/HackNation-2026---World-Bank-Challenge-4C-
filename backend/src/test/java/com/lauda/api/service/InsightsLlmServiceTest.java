package com.lauda.api.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lauda.api.dto.Dto;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import java.net.InetSocketAddress;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
class InsightsLlmServiceTest {
    Dto.InsightsResponse base() {
        var finding = new Dto.Finding("guide", "Tour guide", 1, 1, 1, null, null, "Praise", null, List.of(new Dto.Quote(1,"en",5,"Great guide.")), List.of(1));
        return new Dto.InsightsResponse(new Dto.Meta(1,1,0,"en","v1",null), null, new Dto.Qualitative(List.of(),List.of(finding)), new Dto.Attention(List.of(),null));
    }
    @Test void rejectsInventedEvidenceAndAspects() throws Exception {
        var service = new InsightsLlmService(false,"http://127.0.0.1:11434","qwen3:0.6b","digest",1);
        var context = List.of(Map.<String,Object>of("aspect","guide","polarity","positive","review_ids",List.of(1),"quotes",List.of("Great guide.")));
        var json = new ObjectMapper();
        assertThrows(IllegalArgumentException.class, () -> service.validate(json.readTree("{\"summary\":\"Good\",\"aspect_notes\":[{\"aspect\":\"guide\",\"polarity\":\"positive\",\"text\":\"Praise\",\"review_ids\":[99]}]}"),context,0));
        assertThrows(IllegalArgumentException.class, () -> service.validate(json.readTree("{\"summary\":\"Good\",\"aspect_notes\":[{\"aspect\":\"food\",\"polarity\":\"positive\",\"text\":\"Praise\",\"review_ids\":[1]}]}"),context,0));
        var two = List.of(Map.<String,Object>of("aspect","guide","polarity","positive","review_ids",List.of(1,2),"quotes",List.of("First quote","Second quote")));
        assertThrows(IllegalArgumentException.class, () -> service.validate(json.readTree("{\"summary\":\"Good\",\"aspect_notes\":[{\"aspect\":\"guide\",\"polarity\":\"positive\",\"text\":\"Second quote\",\"review_ids\":[1]}]}"),two,0));
        assertEquals("disabled",service.summarize(base()).status());
        assertThrows(IllegalArgumentException.class, () -> new InsightsLlmService(true,"http://example.com","model","digest",1));
    }
    @Test void localGenerationCachesAndKeepsEvidenceIds() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1",0),0); var calls = new AtomicInteger();
        server.createContext("/api/tags", exchange -> { var bytes = "{\"models\":[{\"name\":\"qwen3:0.6b\",\"digest\":\"digest\"}]}".getBytes(); exchange.sendResponseHeaders(200,bytes.length); exchange.getResponseBody().write(bytes); exchange.close(); });
        server.createContext("/api/chat", exchange -> { calls.incrementAndGet(); var request = new ObjectMapper().readTree(exchange.getRequestBody()); assertFalse(request.path("think").asBoolean()); assertFalse(request.path("stream").asBoolean()); assertEquals(0,request.path("options").path("temperature").intValue()); var content="{\"summary\":\"Among analysed reviews, the guide is praised.\",\"aspect_notes\":[{\"aspect\":\"guide\",\"polarity\":\"positive\",\"text\":\"Great guide.\",\"review_ids\":[1]}]}"; var bytes=new ObjectMapper().writeValueAsBytes(Map.of("message",Map.of("content",content))); exchange.sendResponseHeaders(200,bytes.length); exchange.getResponseBody().write(bytes); exchange.close(); });
        server.start();
        try { var service = new InsightsLlmService(true,"http://127.0.0.1:"+server.getAddress().getPort(),"qwen3:0.6b","digest",2); var result=service.summarize(base()); assertEquals("generated",result.status()); assertEquals(List.of(1),result.aspectNotes().get(0).reviewIds()); assertEquals(result,service.summarize(base())); assertEquals(1,calls.get()); }
        finally { server.stop(0); }
    }
    @Test void unavailableRuntimeAndNoEvidencePreserveBaseFindings() throws Exception {
        var service = new InsightsLlmService(true,"http://127.0.0.1:1","qwen3:0.6b","digest",1);
        assertEquals("not-ready", service.summarize(base()).status());
        var empty = new Dto.InsightsResponse(new Dto.Meta(1,0,1,"en","v1",null), null, new Dto.Qualitative(List.of(),List.of()),new Dto.Attention(List.of(1),"Check"));
        assertEquals("insufficient-evidence",service.summarize(empty).status());
    }
    @Test void timeoutDoesNotLoseCountedFindings() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.createContext("/api/tags", e -> { var bytes="{\"models\":[{\"name\":\"qwen3:0.6b\",\"digest\":\"digest\"}]}".getBytes(); e.sendResponseHeaders(200,bytes.length); e.getResponseBody().write(bytes); e.close(); });
        server.createContext("/api/chat", e -> { try { Thread.sleep(1500); } catch (InterruptedException ex) { Thread.currentThread().interrupt(); } finally { e.close(); } });
        server.start();
        try { var service = new InsightsLlmService(true,"http://127.0.0.1:"+server.getAddress().getPort(),"qwen3:0.6b","digest",1); var base = base(); assertEquals("timeout",service.summarize(base).status()); assertEquals(1,base.qualitative().strengths().get(0).count()); }
        finally { server.stop(0); }
    }
}
