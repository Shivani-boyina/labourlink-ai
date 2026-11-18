package com.labourlink.labourlinkai.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@Component
public class DemoProvenance {
    private final ObjectMapper mapper;
    private final Path manifest;
    public DemoProvenance(ObjectMapper mapper, @Value("${analytics.demo-manifest:.dataset-import-state.json}") String path) {
        this.mapper = mapper;
        this.manifest = Path.of(path);
    }
    public record Cohort(Set<Long> workers, Set<Long> jobs, String sourceHash, String warning) {}
    public Cohort identify(List<Worker> workers, List<Job> jobs) {
        try {
            if (!Files.exists(manifest)) return new Cohort(Set.of(), Set.of(), "", "Demo manifest unavailable");
            var root = mapper.readTree(manifest.toFile());
            Map<Long, Worker> byId = new HashMap<>();
            workers.forEach(w -> byId.put(w.getWorkerId(), w));
            Map<Long, Job> jobsById = new HashMap<>();
            jobs.forEach(j -> jobsById.put(j.getJobId(), j));
            Set<Long> verifiedWorkers = new HashSet<>();
            root.path("workers").fields().forEachRemaining(entry -> {
                var worker = byId.get(entry.getValue().path("id").asLong());
                if (worker != null && Objects.equals(worker.getName(), "Dataset Demo " + entry.getKey())
                        && Objects.equals(worker.getPhone(), entry.getValue().path("phone").asText())) {
                    verifiedWorkers.add(worker.getWorkerId());
                }
            });
            Set<Long> verifiedJobs = new HashSet<>();
            root.path("jobs").fields().forEachRemaining(entry -> {
                var job = jobsById.get(entry.getValue().asLong());
                if (job != null && job.getTitle().startsWith("Dataset Demo " + entry.getKey() + " ")) verifiedJobs.add(job.getJobId());
            });
            return new Cohort(Set.copyOf(verifiedWorkers), Set.copyOf(verifiedJobs), root.path("source_sha256").asText(),
                    verifiedWorkers.size() == root.path("workers").size() && verifiedJobs.size() == root.path("jobs").size()
                            ? "" : "Some manifest records could not be verified");
        } catch (java.io.IOException | RuntimeException e) {
            return new Cohort(Set.of(), Set.of(), "", "Demo manifest could not be verified");
        }
    }
    public static boolean demoName(String value) { return value != null && value.startsWith("Dataset Demo "); }
}
