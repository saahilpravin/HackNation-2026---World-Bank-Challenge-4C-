package com.lauda.api.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice
public class ApiErrors {

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, Object>> status(ResponseStatusException e) {
        int code = e.getStatusCode().value();
        String name = code == 503 ? "model_unavailable" : code == 400 ? "bad_request" : "error";
        return ResponseEntity.status(code).body(Map.of("error", Map.of("code", name,
                "message", e.getReason() == null ? name : e.getReason())));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> other(Exception e) {
        e.printStackTrace();
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                Map.of("error", Map.of("code", "internal", "message", "Something went wrong")));
    }
}