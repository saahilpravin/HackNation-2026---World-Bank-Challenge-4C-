package com.lauda.api.controller;
import com.lauda.api.dto.Dto;
import com.lauda.api.service.ClassifierService;
import com.lauda.api.service.InsightService;
import com.lauda.api.service.SmallLlmService;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class WorkspaceControllerTest {
 @Test void rejectsDuplicateIdsAndOversizedText() {
  var review=new WorkspaceController.Review("r15","Good friendly guide", "en",5);
  assertThrows(Exception.class,()->WorkspaceController.validate(new WorkspaceController.Request(List.of(review,review))));
  assertThrows(Exception.class,()->WorkspaceController.validate(new WorkspaceController.Request(List.of(new WorkspaceController.Review("a","x".repeat(4001),"en",5)))));
 }
 @Test void preservesImportedIdsAndEvidence() throws Exception {
  var classifier=mock(ClassifierService.class);
  when(classifier.analyze(any())).thenReturn(new Dto.AnalyzeResponse(0,List.of(new Dto.AspectHit("guide","negative",.8)),"negative",false,"v1"));
  var llm=mock(SmallLlmService.class);
  when(llm.generate(any(),any())).thenReturn(new SmallLlmService.Output("qwen3:0.6b","unavailable",0,List.of()));
  var result=new WorkspaceController(classifier,new InsightService(),llm).analyze(new WorkspaceController.Request(List.of(new WorkspaceController.Review("yelp-abc","The guide rushed the visit", "en",2))));
  assertEquals("yelp-abc",result.reviews().get(0).id());
  assertEquals(List.of("yelp-abc"),result.criticized().get(0).reviewIds());
  assertEquals("local-laptop-model",result.source());
 }
}
