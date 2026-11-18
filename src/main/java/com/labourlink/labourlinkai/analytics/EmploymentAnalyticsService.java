package com.labourlink.labourlinkai.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labourlink.labourlinkai.entity.*;
import com.labourlink.labourlinkai.repository.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class EmploymentAnalyticsService {
    static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
    private final WorkerRepository workers;
    private final JobRepository jobs;
    private final ApplicationRepository applications;
    private final JdbcTemplate jdbc;
    private final DemoProvenance provenance;
    private final AnalyticsRunRepository runs;
    private final ObjectMapper mapper;
    public EmploymentAnalyticsService(WorkerRepository workers, JobRepository jobs, ApplicationRepository applications,
                                     JdbcTemplate jdbc, DemoProvenance provenance, AnalyticsRunRepository runs, ObjectMapper mapper) {
        this.workers = workers; this.jobs = jobs; this.applications = applications;
        this.jdbc = jdbc; this.provenance = provenance; this.runs = runs; this.mapper = mapper;
    }
    record Assignment(long worker, long job, String status, LocalDate start, LocalDate end) {
        boolean current(LocalDate day) {
            return "ACTIVE".equals(status) && (start == null || !day.isBefore(start)) && (end == null || !day.isAfter(end));
        }
        boolean covered(LocalDate day) {
            return !"CANCELLED".equals(status) && start != null && end != null && !day.isBefore(start) && !day.isAfter(end);
        }
    }
    public record Group(String name, int total, long employed, long unemployed, long unknown) {}
    public record Trend(LocalDate date, long hires, long datedAssignments) {}
    public record Summary(String cohort, int totalWorkers, long employedWorkers, long unemployedWorkers,
                          long unknownWorkers, long hiredToday, double hiringPercentage, double employmentRate,
                          double unemploymentRate, Long workersWithMlRecommendations, String recommendationMeasuredAt,
                          Double averageUnemploymentDays, int unemploymentDurationCoverage,
                          List<Group> skills, List<Group> locations, List<Trend> trends) {}
    public record Dashboard(String generatedAt, String timezone, String provenanceWarning, int unclassifiedDemoWorkers,
                            Summary actual, Summary demo, List<String> definitions) {}

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public Dashboard dashboard(int days) {
        LocalDate today = LocalDate.now(ZONE);
        var people = workers.findAll();
        var vacancies = jobs.findAll();
        var source = provenance.identify(people, vacancies);
        Set<Long> actualJobs = new HashSet<>();
        vacancies.stream().filter(j -> !source.jobs().contains(j.getJobId()) && !DemoProvenance.demoName(j.getTitle()))
                .forEach(j -> actualJobs.add(j.getJobId()));
        var assignments = jdbc.query("SELECT worker_id, job_id, status, start_date, end_date FROM worker_allocations", (r, i) ->
                new Assignment(r.getLong(1), r.getLong(2), r.getString(3), r.getObject(4, LocalDate.class), r.getObject(5, LocalDate.class)));
        var coverage = jdbc.query("SELECT c.worker_id, a.job_id, c.work_date FROM replacement_coverage c JOIN replacement_requests r ON r.id = c.request_id JOIN worker_allocations a ON a.allocation_id = r.allocation_id", (r, i) ->
                new Assignment(r.getLong(1), r.getLong(2), "ACTIVE", r.getObject(3, LocalDate.class), r.getObject(3, LocalDate.class)));
        assignments.addAll(coverage);
        var accepted = applications.findAll().stream().filter(a -> "ACCEPTED".equals(a.getStatus())).toList();
        var actual = people.stream().filter(w -> !source.workers().contains(w.getWorkerId()) && !DemoProvenance.demoName(w.getName())).toList();
        var demo = people.stream().filter(w -> source.workers().contains(w.getWorkerId())).toList();
        return new Dashboard(Instant.now().toString(), ZONE.toString(), source.warning(), people.size() - actual.size() - demo.size(),
                summarize("actual", actual, actualJobs, assignments, accepted, today, days),
                summarize("demo", demo, source.jobs(), assignments, accepted, today, days), List.of(
                "Employment means a current ACTIVE allocation or replacement coverage for today. It is independent of match scores.",
                "Unemployed means no recorded current assignment. Accepted applications missing an allocation are classified as unknown.",
                "Hiring percentage is distinct workers accepted today divided by registered workers in the selected cohort, using Asia/Kolkata dates.",
                "Trends reconstruct dated assignment coverage from current records. Undated assignments and historical status changes cannot be reconstructed.",
                "Average unemployment duration covers workers with a dated COMPLETED assignment and no current assignment, measured since their latest recorded end date.",
                "ML recommendation counts are distinct workers with successfully scored eligible candidates in the latest demo validation snapshot. Actual cohort telemetry is unavailable.",
                "Demo assignments and unverified demo-looking records are excluded from actual employment outcomes. Platform records do not establish population unemployment rates."));
    }

    private Summary summarize(String cohort, List<Worker> people, Set<Long> jobIds, List<Assignment> all,
                              List<Application> accepted, LocalDate today, int days) {
        Set<Long> ids = new HashSet<>(); people.forEach(w -> ids.add(w.getWorkerId()));
        var assignments = all.stream().filter(a -> ids.contains(a.worker) && jobIds.contains(a.job)).toList();
        Set<Long> employed = new HashSet<>();
        assignments.stream().filter(a -> a.current(today)).forEach(a -> employed.add(a.worker));
        var hires = accepted.stream().filter(a -> ids.contains(a.getWorkerId()) && jobIds.contains(a.getJobId())).toList();
        Set<Long> allocatedPairs = new HashSet<>();
        // Application IDs identify reconciliation gaps without treating completed jobs as current employment.
        allocatedPairs.addAll(jdbc.query("SELECT application_id FROM worker_allocations", (r, i) -> r.getLong(1)));
        Set<Long> unknown = new HashSet<>();
        hires.stream().filter(a -> !allocatedPairs.contains(a.getApplicationId()) && !employed.contains(a.getWorkerId()))
                .forEach(a -> unknown.add(a.getWorkerId()));
        long todayHires = hires.stream().filter(a -> a.getAcceptedAt() != null && a.getAcceptedAt().atZone(ZONE).toLocalDate().equals(today))
                .map(Application::getWorkerId).distinct().count();
        Map<Long, LocalDate> lastEnd = new HashMap<>();
        assignments.stream().filter(a -> "COMPLETED".equals(a.status) && a.end != null && a.end.isBefore(today)
                && !employed.contains(a.worker) && !unknown.contains(a.worker))
                .forEach(a -> lastEnd.merge(a.worker, a.end, (left, right) -> left.isAfter(right) ? left : right));
        Double average = lastEnd.isEmpty() ? null : lastEnd.values().stream().mapToLong(end -> Math.max(0, ChronoUnit.DAYS.between(end, today) - 1)).average().orElse(0);
        List<Trend> trends = new ArrayList<>();
        for (LocalDate date = today.minusDays(days - 1); !date.isAfter(today); date = date.plusDays(1)) {
            LocalDate day = date;
            trends.add(new Trend(day, hires.stream().filter(a -> a.getAcceptedAt() != null && a.getAcceptedAt().atZone(ZONE).toLocalDate().equals(day))
                    .map(Application::getWorkerId).distinct().count(), assignments.stream().filter(a -> a.covered(day)).map(Assignment::worker).distinct().count()));
        }
        Long ml = null; String measured = null;
        if (cohort.equals("demo")) {
            var latest = runs.findFirstByOrderByStartedAtDesc();
            if (latest.isPresent() && "COMPLETED".equals(latest.get().status)) {
                try {
                    ml = mapper.readTree(latest.get().report).path("workersWithMlRecommendations").asLong();
                    measured = latest.get().completedAt.toString();
                } catch (java.io.IOException ignored) { /* An unreadable observation remains unavailable. */ }
            }
        }
        long unemployed = people.size() - employed.size() - unknown.size();
        return new Summary(cohort, people.size(), employed.size(), unemployed, unknown.size(), todayHires,
                rate(todayHires, people.size()), rate(employed.size(), people.size()), rate(unemployed, people.size()), ml, measured,
                average, lastEnd.size(), groups(people, employed, unknown, true), groups(people, employed, unknown, false), trends);
    }
    static double rate(long count, long total) { return total == 0 ? 0 : Math.round(count * 10000.0 / total) / 100.0; }
    private List<Group> groups(List<Worker> people, Set<Long> employed, Set<Long> unknown, boolean skill) {
        Map<String, List<Worker>> grouped = new TreeMap<>();
        for (Worker w : people) {
            String value = skill ? w.getSkill() : w.getLocation();
            grouped.computeIfAbsent(value == null || value.isBlank() ? "Unknown" : value.strip().toLowerCase(Locale.ROOT), k -> new ArrayList<>()).add(w);
        }
        return grouped.entrySet().stream().map(entry -> {
            long employedCount = entry.getValue().stream().filter(w -> employed.contains(w.getWorkerId())).count();
            long unknownCount = entry.getValue().stream().filter(w -> unknown.contains(w.getWorkerId())).count();
            return new Group(entry.getKey(), entry.getValue().size(), employedCount, entry.getValue().size() - employedCount - unknownCount, unknownCount);
        }).toList();
    }
}
