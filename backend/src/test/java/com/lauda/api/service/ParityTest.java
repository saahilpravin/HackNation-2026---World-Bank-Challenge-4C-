package com.lauda.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class ParityTest {

    @Autowired
    ClassifierService svc;

    @Test
    void matchesPython() throws Exception {
        JsonNode golden = new ObjectMapper()
                .readTree(Path.of("../ml/artifacts/golden.json").toFile());

        double worst = 0;
        for (JsonNode g : golden) {
            double[] p = svc.scores(g.get("text").asText());
            for (int j = 0; j < p.length; j++) {
                worst = Math.max(worst, Math.abs(p[j] - g.get("probs").get(j).asDouble()));
            }
        }
        System.out.println("max prob diff vs Python: " + worst);
        assertTrue(worst < 0.01, "Java and Python disagree: " + worst);
    }
}