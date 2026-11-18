package com.labourlink.labourlinkai.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PreDestroy;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

@RestController
@RequestMapping("/analytics")
public class AnalyticsController {
    private final EmploymentAnalyticsService employment;
    private final DatasetValidationEngine engine;
    private final AnalyticsRunRepository runs;
    private final ObjectMapper mapper;
    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread thread = new Thread(r, "dataset-validation"); thread.setDaemon(true); return thread;
    });
    private boolean running;
    public AnalyticsController(EmploymentAnalyticsService employment, DatasetValidationEngine engine, AnalyticsRunRepository runs, ObjectMapper mapper) {
        this.employment = employment; this.engine = engine; this.runs = runs; this.mapper = mapper;
        runs.findFirstByOrderByStartedAtDesc().filter(run -> "RUNNING".equals(run.status)).ifPresent(run -> {
            run.status = "FAILED"; run.error = "Server restarted before validation completed"; run.completedAt = Instant.now(); runs.save(run);
        });
    }
    @GetMapping("/employment")
    public EmploymentAnalyticsService.Dashboard dashboard(@RequestParam(defaultValue = "30") int days) {
        if (days != 7 && days != 30) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose 7 or 30 days");
        return employment.dashboard(days);
    }
    @PostMapping("/validation")
    public synchronized ResponseEntity<AnalyticsValidationRun> start() {
        if (running) throw new ResponseStatusException(HttpStatus.CONFLICT, "Validation is already running");
        var run = runs.save(new AnalyticsValidationRun(UUID.randomUUID().toString()));
        running = true;
        executor.submit(() -> execute(run));
        return ResponseEntity.accepted().body(run);
    }
    private void execute(AnalyticsValidationRun run) {
        try {
            run.report = mapper.writeValueAsString(engine.validate());
            run.status = "COMPLETED";
        } catch (Exception e) {
            run.status = "FAILED";
            run.error = "Validation could not complete. Verify the demo manifest, database schema and ML service.";
            org.slf4j.LoggerFactory.getLogger(getClass()).error("Dataset validation failed", e);
        } finally {
            run.completedAt = Instant.now();
            try { runs.save(run); } finally { synchronized (this) { running = false; } }
        }
    }
    @GetMapping("/validation/latest")
    public Object latest() throws java.io.IOException {
        var latest = runs.findFirstByOrderByStartedAtDesc();
        if (latest.isEmpty()) return Map.of("status", "NOT_RUN");
        var run = latest.get();
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("id", run.id); response.put("status", run.status); response.put("startedAt", run.startedAt);
        response.put("completedAt", run.completedAt); response.put("error", run.error);
        response.put("report", run.report == null ? null : mapper.readTree(run.report));
        return response;
    }
    @PreDestroy public void close() { executor.shutdownNow(); }
}
