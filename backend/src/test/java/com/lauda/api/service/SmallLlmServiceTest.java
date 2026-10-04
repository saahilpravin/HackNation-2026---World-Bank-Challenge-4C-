package com.lauda.api.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lauda.api.dto.Dto;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
class SmallLlmServiceTest {
 private final Dto.InsightsResponse insights=new Dto.InsightsResponse(1,List.of(),List.of(new Dto.SummaryPoint("guide","negative",1,1,"Concern",List.of(7))),List.of());
 @Test void evidenceComesFromClassifierNotGeneratedIds() throws Exception {
  var node=new ObjectMapper().readTree("{\"advice\":[{\"aspect\":\"guide\",\"title\":\"Test a shorter introduction\",\"text\":\"Try a brief introduction.\",\"reviewIds\":[999]}]}");
  assertEquals(List.of(7),SmallLlmService.validate(node,insights).get(0).reviewIds());
 }
 @Test void rejectsInventedCategories() throws Exception {
  var node=new ObjectMapper().readTree("{\"advice\":[{\"aspect\":\"food\",\"title\":\"Title\",\"text\":\"Text\"}]}");
  assertThrows(Exception.class,()->SmallLlmService.validate(node,insights));
 }
}
