package com.labourlink.labourlinkai.analytics;

import com.labourlink.labourlinkai.entity.*;
import com.labourlink.labourlinkai.integration.*;
import com.labourlink.labourlinkai.repository.*;
import com.labourlink.labourlinkai.review.ReviewReadRepository;
import com.labourlink.labourlinkai.service.WorkerMatchingService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.time.Instant;
import java.util.*;

@Service
public class DatasetValidationEngine {
    private final WorkerRepository workers;
    private final JobRepository jobs;
    private final DemoProvenance provenance;
    private final MatchingDataRepository history;
    private final ReviewReadRepository reviews;
    private final MLMatchScoring scoring;
    private final JdbcTemplate jdbc;
    public DatasetValidationEngine(WorkerRepository workers, JobRepository jobs, DemoProvenance provenance,
                                   MatchingDataRepository history, ReviewReadRepository reviews, MLMatchScoring scoring, JdbcTemplate jdbc) {
        this.workers = workers; this.jobs = jobs; this.provenance = provenance;
        this.history = history; this.reviews = reviews; this.scoring = scoring; this.jdbc = jdbc;
    }
    record Pair(long worker, long job, MLFeatureMapper.Input input) {}
    public record WorkerResult(long workerId, int eligibleRecommendations, int mlRecommendations, List<String> diagnostics) {}
    public record Report(String sourceHash, String measuredAt, int workersCovered, int jobsCovered, int openJobsWithCapacity,
                         long possiblePairs, long candidatePairsChecked, long eligiblePairs, long mlScoredPairs,
                         long workersWithMlRecommendations, long workersWithZeroRecommendations, long workersWithoutMlScores,
                         Map<String, Long> scoreDistribution, Map<String, Long> errors, Map<String, Long> featureIssues,
                         List<WorkerResult> workers, String provenanceWarning) {}

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Report validate() {
        Instant now = Instant.now();
        var allWorkers = workers.findAll();
        var allJobs = jobs.findAll();
        var cohort = provenance.identify(allWorkers, allJobs);
        if (cohort.workers().isEmpty() || cohort.jobs().isEmpty()) throw new IllegalStateException("Verified demo dataset unavailable");
        var people = allWorkers.stream().filter(w -> cohort.workers().contains(w.getWorkerId())).toList();
        var vacancies = allJobs.stream().filter(j -> cohort.jobs().contains(j.getJobId())).toList();
        Map<Long, Long> occupied = new HashMap<>();
        jdbc.query("""
                SELECT a.job_id, COUNT(*) FROM applications a
                WHERE a.status = 'ACCEPTED' AND NOT EXISTS
                  (SELECT 1 FROM worker_allocations x WHERE x.application_id = a.application_id AND x.status = 'CANCELLED')
                GROUP BY a.job_id
                """, r -> { occupied.put(r.getLong(1), r.getLong(2)); });
        var open = vacancies.stream().filter(j -> "OPEN".equalsIgnoreCase(j.getStatus()) && j.getRequiredWorkers() != null
                && j.getRequiredWorkers() > occupied.getOrDefault(j.getJobId(), 0L)).toList();
        Map<String, List<Worker>> index = new HashMap<>();
        Map<Long, Integer> eligibleCounts = new HashMap<>();
        Map<Long, Integer> scoredCounts = new HashMap<>();
        Map<Long, Set<String>> diagnostics = new HashMap<>();
        for (Worker worker : people) {
            index.computeIfAbsent(key(worker.getSkill(), worker.getLocation()), k -> new ArrayList<>()).add(worker);
            diagnostics.put(worker.getWorkerId(), new TreeSet<>());
        }
        var ratings = reviews.ratings(cohort.workers());
        var monthly = history.monthlyAllocations(cohort.workers(), MatchingDataRepository.Month.containing(now));
        Map<String, Long> errors = new TreeMap<>();
        Map<String, Long> issues = new TreeMap<>();
        Map<String, Long> histogram = new LinkedHashMap<>();
        for (String bin : List.of("0–19", "20–39", "40–59", "60–79", "80–100")) histogram.put(bin, 0L);
        List<Pair> batch = new ArrayList<>();
        long candidatePairs = 0;
        long eligiblePairs = 0;
        for (Job job : open) {
            var candidates = index.getOrDefault(key(job.getRequiredSkill(), job.getLocation()), List.of());
            candidatePairs += candidates.size();
            var profiles = candidates.stream().filter(w -> WorkerMatchingService.eligibleProfile(job, w)).toList();
            var unavailable = history.unavailableFor(profiles.stream().map(Worker::getWorkerId).toList(), job, now);
            for (Worker worker : candidates) {
                var reasons = diagnostics.get(worker.getWorkerId());
                if (!WorkerMatchingService.eligibleProfile(job, worker)) {
                    if (!Boolean.TRUE.equals(worker.getAvailability())) reasons.add("UNAVAILABLE");
                    if (worker.getExpectedWagePerDay() != null && job.getWagePerDay() != null && worker.getExpectedWagePerDay() > job.getWagePerDay()) reasons.add("WAGE_REQUIREMENT");
                    if (job.getMinimumExperience() != null && (worker.getExperience() == null || worker.getExperience() < job.getMinimumExperience())) reasons.add("EXPERIENCE_REQUIREMENT");
                    reasons.add("PROFILE_OR_REGION_CONSTRAINT");
                    continue;
                }
                if (unavailable.contains(worker.getWorkerId())) { reasons.add("SCHEDULE_OR_EXISTING_ASSIGNMENT"); continue; }
                eligiblePairs++;
                eligibleCounts.merge(worker.getWorkerId(), 1, Integer::sum);
                batch.add(new Pair(worker.getWorkerId(), job.getJobId(), MLFeatureMapper.from(worker, job,
                        ratings.getOrDefault(worker.getWorkerId(), ReviewReadRepository.Rating.UNRATED), monthly.countFor(worker.getWorkerId()))));
                if (batch.size() == 256) consume(batch, scoredCounts, diagnostics, histogram, errors, issues);
            }
        }
        consume(batch, scoredCounts, diagnostics, histogram, errors, issues);
        Set<String> skills = new HashSet<>();
        Set<String> places = new HashSet<>();
        open.forEach(j -> { skills.add(normalize(j.getRequiredSkill())); places.add(key(j.getRequiredSkill(), j.getLocation())); });
        List<WorkerResult> results = new ArrayList<>();
        for (Worker worker : people) {
            var reasons = diagnostics.get(worker.getWorkerId());
            if (!skills.contains(normalize(worker.getSkill()))) reasons.add("NO_OPEN_JOB_FOR_SKILL");
            else if (!places.contains(key(worker.getSkill(), worker.getLocation()))) reasons.add("LOCATION_CONSTRAINT");
            if (worker.getSkill() == null || worker.getLocation() == null || worker.getCategory() == null || worker.getState() == null
                    || worker.getDistrict() == null || worker.getExpectedWagePerDay() == null) reasons.add("MISSING_PROFILE_DATA");
            results.add(new WorkerResult(worker.getWorkerId(), eligibleCounts.getOrDefault(worker.getWorkerId(), 0),
                    scoredCounts.getOrDefault(worker.getWorkerId(), 0), List.copyOf(reasons)));
        }
        long scored = histogram.values().stream().mapToLong(Long::longValue).sum();
        return new Report(cohort.sourceHash(), now.toString(), people.size(), vacancies.size(), open.size(),
                (long) people.size() * vacancies.size(), candidatePairs, eligiblePairs, scored,
                scoredCounts.size(), people.size() - eligibleCounts.size(), people.size() - scoredCounts.size(),
                histogram, errors, issues, results, cohort.warning());
    }
    private void consume(List<Pair> batch, Map<Long, Integer> scored, Map<Long, Set<String>> diagnostics,
                         Map<String, Long> histogram, Map<String, Long> errors, Map<String, Long> issues) {
        if (batch.isEmpty()) return;
        var scores = scoring.scoreAll(batch.stream().map(Pair::input).toList());
        var bins = List.copyOf(histogram.keySet());
        for (int i = 0; i < scores.size(); i++) {
            var result = scores.get(i);
            long worker = batch.get(i).worker;
            if ("ML".equals(result.method())) {
                scored.merge(worker, 1, Integer::sum);
                histogram.merge(bins.get(Math.min(4, (int) (result.matchPercentage() / 20))), 1L, Long::sum);
            } else {
                errors.merge(result.fallbackReason(), 1L, Long::sum);
                diagnostics.get(worker).add(result.fallbackReason());
                result.featureIssues().forEach(issue -> issues.merge(issue.feature() + "/" + issue.reason(), 1L, Long::sum));
            }
        }
        batch.clear();
    }
    private static String normalize(String value) { return value == null ? "" : value.strip().toLowerCase(Locale.ROOT); }
    private static String key(String skill, String location) { return normalize(skill) + "\u0000" + normalize(location); }
}
