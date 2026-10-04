package com.lauda.api.service;
import com.lauda.api.dto.Dto;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.function.IntConsumer;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
class InsightsJobServiceTest {
    @Test void reportsProgressDeduplicatesActiveBatchAndBoundsWork() throws Exception {
        var insights=mock(InsightService.class); var entered=new CountDownLatch(1); var release=new CountDownLatch(1);
        var req=new Dto.InsightsRequest("en",List.of(new Dto.ReviewIn(1,"Good guide","en",5,null)),false);
        when(insights.withNarrative(eq(req),any())).thenAnswer(call -> { ((IntConsumer)call.getArgument(1)).accept(1); entered.countDown(); release.await(5,TimeUnit.SECONDS); return new Dto.InsightsResponse(new Dto.Meta(1,1,0,"en","v1",null),null,null,null); });
        var jobs=new InsightsJobService(insights);
        try { var first=jobs.start(req); assertTrue(entered.await(5,TimeUnit.SECONDS)); assertEquals(first.id(),jobs.start(req).id()); assertEquals(1,jobs.get(first.id()).processed());
            assertThrows(ResponseStatusException.class,() -> jobs.start(new Dto.InsightsRequest("fr",req.reviews(),false)));
            assertThrows(ResponseStatusException.class,() -> jobs.get("unknown"));
            release.countDown(); for(int i=0;i<100 && !jobs.get(first.id()).status().equals("completed");i++) Thread.sleep(10);
            assertEquals("completed",jobs.get(first.id()).status()); assertEquals(1,jobs.get(first.id()).result().meta().analysed()); verify(insights,times(1)).withNarrative(eq(req),any());
        } finally { release.countDown(); jobs.close(); }
    }
}
