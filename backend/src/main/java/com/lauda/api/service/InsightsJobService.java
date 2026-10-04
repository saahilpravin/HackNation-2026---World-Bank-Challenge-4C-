package com.lauda.api.service;
import com.lauda.api.dto.Dto;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import jakarta.annotation.PreDestroy;
import java.util.*;
import java.util.concurrent.*;

/** One bounded local batch, polled by the UI instead of holding a long HTTP request. */
@Service
public class InsightsJobService {
    private final InsightService insights;
    private final ExecutorService worker=Executors.newSingleThreadExecutor(r -> { var t=new Thread(r,"lauda-insights"); t.setDaemon(true); return t; });
    private final LinkedHashMap<String,Job> jobs=new LinkedHashMap<>();
    private static class Job {
        final String id=UUID.randomUUID().toString(); final Dto.InsightsRequest request;
        volatile int processed; volatile String status="queued",error; volatile Dto.InsightsResponse result;
        Job(Dto.InsightsRequest request) { this.request=request; }
        Dto.InsightJob snapshot() { return new Dto.InsightJob(id,status,request.reviews().size(),processed,result,error); }
    }
    public InsightsJobService(InsightService insights) { this.insights=insights; }
    public synchronized Dto.InsightJob start(Dto.InsightsRequest request) {
        for(var job:jobs.values()) if(job.status.equals("queued") || job.status.equals("running")) {
            if(job.request.equals(request)) return job.snapshot();
            throw new ResponseStatusException(HttpStatus.CONFLICT,"Another review batch is running. Try again when it finishes.");
        }
        while(jobs.size()>=8) jobs.remove(jobs.keySet().iterator().next());
        var job=new Job(request); jobs.put(job.id,job);
        worker.submit(() -> {
            job.status="running";
            try { job.result=insights.withNarrative(request,n -> job.processed=n); job.status="completed"; }
            catch(Exception e) { job.error="Could not finish local review analysis. Check the model services and retry. Completed translations are retained."; job.status="failed"; }
        }); return job.snapshot();
    }
    public synchronized Dto.InsightJob get(String id) { var job=jobs.get(id); if(job==null) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Insight job expired; start again."); return job.snapshot(); }
    @PreDestroy public void close() { worker.shutdownNow(); }
}
