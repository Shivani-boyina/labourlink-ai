package com.labourlink.labourlinkai.application;

import com.labourlink.labourlinkai.TestDatabaseSafetyInitializer;
import com.labourlink.labourlinkai.entity.Application;
import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.repository.MatchingDataRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.service.ApplicationService;
import com.labourlink.labourlinkai.service.JobService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ContextConfiguration;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ContextConfiguration(initializers = TestDatabaseSafetyInitializer.class)
@EnabledIfEnvironmentVariable(named = "LABOURLINK_BATCH105_PIPE", matches = "LabourLinkRestore_[a-f0-9]{32}")
class IsolatedMatchingMySqlTest {
    @Autowired MatchingDataRepository history;
    @Autowired JobService matching;
    @Autowired ApplicationService applications;
    @Autowired ApplicationRepository applicationRecords;
    @Autowired WorkerRepository workers;
    @Autowired ContractorRepository contractors;
    @Autowired JobRepository jobs;
    @Autowired JdbcTemplate jdbc;

    @Test
    void calendarMonthCountsOnlyAllocationEventsInsideIndianMonth() {
        Contractor contractor = contractor(601);
        Worker allocated = worker(602);
        Worker genuineZero = worker(603);
        Worker legacy = worker(604);
        Worker archived = worker(605);
        var month = MatchingDataRepository.Month.containing(Instant.parse("2026-08-31T18:30:00Z"));
        assertThat(month.start()).isEqualTo(Instant.parse("2026-08-31T18:30:00Z"));
        assertThat(month.end()).isEqualTo(Instant.parse("2026-09-30T18:30:00Z"));
        assertThat(MatchingDataRepository.Month.containing(month.start().minusNanos(1000)).end()).isEqualTo(month.start());
        allocateWithTimestamp(contractor, allocated, month.start().minusNanos(1000));
        allocateWithTimestamp(contractor, allocated, month.start());
        allocateWithTimestamp(contractor, allocated, month.end().minusNanos(1000));
        allocateWithTimestamp(contractor, allocated, month.end());
        Job legacyJob = job(contractor, 2);
        applicationRecords.save(new Application(null, legacyJob.getJobId(), legacy.getWorkerId(), null, "ACCEPTED"));
        jdbc.update("""
                INSERT INTO archived_application_history
                (application_id, job_id, job_title, original_worker_id, original_status, application_date)
                VALUES (950002, ?, 'Scratch archived job', ?, 'ACCEPTED', '2026-01-15')
                """, legacyJob.getJobId(), archived.getWorkerId());
        var counts = history.monthlyAllocations(List.of(allocated.getWorkerId(), genuineZero.getWorkerId(),
                legacy.getWorkerId(), archived.getWorkerId()), month);
        assertThat(counts.countFor(allocated.getWorkerId())).hasValue(2);
        assertThat(counts.countFor(genuineZero.getWorkerId())).hasValue(0);
        assertThat(counts.countFor(legacy.getWorkerId())).isEmpty();
        assertThat(counts.countFor(archived.getWorkerId())).isEmpty();
    }

    @Test
    void workerRecommendationsScoreEligibleOpenJobsWithoutShowingUnrelatedOrExpiredJobs() {
        Contractor owner = contractor(631);
        Worker applicant = worker(632);
        Job eligible = job(owner, 2);
        Job unrelated = job(owner, 2);
        unrelated.setRequiredSkill("Painter");
        jobs.save(unrelated);
        Job expired = job(owner, 2);
        LocalDate yesterday = LocalDate.now(ZoneId.of("Asia/Kolkata")).minusDays(1);
        expired.setStartDate(yesterday.minusDays(1));
        expired.setEndDate(yesterday);
        jobs.save(expired);

        var results = matching.findRecommendedJobs(applicant.getPhone());
        assertThat(results).noneMatch(row -> List.of(unrelated.getJobId(), expired.getJobId())
                .contains(row.getJob().getJobId()));
        assertThat(results).filteredOn(row -> row.getJob().getJobId().equals(eligible.getJobId()))
                .singleElement().satisfies(row -> {
                    assertThat(row.getMatchingScore()).isEqualTo(100);
                    assertThat(row.getRecommendation()).isNotNull();
                    if (System.getenv("LABOURLINK_ML_TEST_URL") != null) {
                        assertThat(row.getRecommendation().method()).isEqualTo("ML");
                        assertThat(row.getRecommendation().matchPercentage()).isBetween(0.0, 100.0);
                    }
                });
        accept(owner, applicant, eligible);
        assertThat(matching.findRecommendedJobs(applicant.getPhone()))
                .noneMatch(row -> row.getJob().getJobId().equals(eligible.getJobId()));
    }

    @Test
    void candidateEligibilityPrecedesScoringAndFullJobsGetNoRecommendations() {
        Contractor owner = contractor(611);
        Worker eligible = worker(612);
        Worker unavailable = worker(613);
        unavailable.setAvailability(false);
        workers.save(unavailable);
        Worker expensive = worker(614);
        expensive.setExpectedWagePerDay(900.0);
        workers.save(expensive);
        Worker allocated = worker(615);
        accept(owner, allocated, job(owner, 1));
        Worker incomplete = worker(616);
        incomplete.setExpectedWagePerDay(null);
        workers.save(incomplete);

        Job job = job(owner, 1);
        var results = matching.findMatchingWorkers(job.getJobId(), true);
        assertThat(results).noneMatch(row -> List.of(unavailable.getWorkerId(), expensive.getWorkerId(),
                allocated.getWorkerId()).contains(row.getWorkerId()));
        assertThat(results).filteredOn(row -> row.getWorkerId().equals(incomplete.getWorkerId()))
                .singleElement().satisfies(row -> {
                    assertThat(row.getRecommendation().method()).isEqualTo("RULE_BASED");
                    assertThat(row.getRecommendation().featureIssues()).anyMatch(issue -> issue.feature().equals("expected_daily_wage"));
                });
        assertThat(results).filteredOn(row -> row.getWorkerId().equals(eligible.getWorkerId()))
                .singleElement().satisfies(row -> {
                    assertThat(row.getReviewCount()).isZero();
                    assertThat(row.getAverageRating()).isNull();
                    if (System.getenv("LABOURLINK_ML_TEST_URL") != null) {
                        assertThat(row.getRecommendation().method()).isEqualTo("ML");
                        assertThat(row.getRecommendation().matchPercentage()).isBetween(0.0, 100.0);
                        System.out.println("Original model from MySQL-backed matching test: "
                                + row.getRecommendation().matchPercentage() + "%");
                    }
                });
        assertThat(matching.findMatchingWorkers(job.getJobId(), false)).allMatch(row -> row.getRecommendation() == null);
        accept(owner, eligible, job);
        assertThat(matching.findMatchingWorkers(job.getJobId(), true)).isEmpty();
    }

    private void allocateWithTimestamp(Contractor owner, Worker worker, Instant at) {
        Long application = accept(owner, worker, job(owner, 2));
        jdbc.update("UPDATE worker_allocations SET allocated_at = ? WHERE application_id = ?",
                LocalDateTime.ofInstant(at, ZoneOffset.UTC), application);
    }

    private Long accept(Contractor owner, Worker worker, Job job) {
        var application = applications.applyForJob(job.getJobId(), worker.getPhone());
        applications.updateStatus(application.getApplicationId(), "ACCEPTED", owner.getPhone());
        return application.getApplicationId();
    }

    private Contractor contractor(int id) {
        var contractor = new Contractor("Scratch owner", "Scratch team", String.format("%010d", id), "Hyderabad");
        contractor.setPassword("fixture-only");
        return contractors.save(contractor);
    }

    private Worker worker(int id) {
        var worker = new Worker(null, "Scratch worker", String.format("%010d", id), "fixture-only",
                "Mason", 5, "Hyderabad", true);
        worker.setCategory("skilled");
        worker.setState("Telangana");
        worker.setDistrict("Hyderabad");
        worker.setExpectedWagePerDay(550.0);
        return workers.save(worker);
    }

    private Job job(Contractor owner, int capacity) {
        var job = new Job(null, "Scratch job", "", "Mason", "Hyderabad", 650.0, capacity, "OPEN", owner.getContractorId());
        job.setCategory("Masonry");
        job.setState("Telangana");
        job.setDistrict("Hyderabad");
        job.setDurationDays(2);
        job.setMinimumExperience(1);
        LocalDate start = LocalDate.now(ZoneId.of("Asia/Kolkata")).plusDays(1);
        job.setStartDate(start);
        job.setEndDate(start.plusDays(1));
        return jobs.save(job);
    }
}
