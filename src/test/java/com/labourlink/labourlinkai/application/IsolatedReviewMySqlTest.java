package com.labourlink.labourlinkai.application;

import com.labourlink.labourlinkai.TestDatabaseSafetyInitializer;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionInput;
import com.labourlink.labourlinkai.entity.Application;
import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.DailyAttendance.Status;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.replacement.ReplacementService;
import com.labourlink.labourlinkai.review.ReviewReadRepository;
import com.labourlink.labourlinkai.review.WorkerReviewService;
import com.labourlink.labourlinkai.service.AllocationService;
import com.labourlink.labourlinkai.service.ApplicationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ContextConfiguration;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ContextConfiguration(initializers = TestDatabaseSafetyInitializer.class)
@EnabledIfEnvironmentVariable(named = "LABOURLINK_BATCH105_PIPE", matches = "LabourLinkRestore_[a-f0-9]{32}")
class IsolatedReviewMySqlTest {
    @Autowired WorkerReviewService reviews;
    @Autowired ReviewReadRepository reads;
    @Autowired AllocationService allocations;
    @Autowired ApplicationService applications;
    @Autowired ReplacementService replacements;
    @Autowired JobRepository jobs;
    @Autowired WorkerRepository workers;
    @Autowired ContractorRepository contractors;
    @Autowired ApplicationRepository applicationRecords;
    @Autowired JdbcTemplate jdbc;
    private static final String REASON = "Verified against the signed attendance sheet";

    @Test
    void concurrentReviewAndCorrectionsPreserveEvidenceAndRecomputeRatings() throws Exception {
        Contractor owner = contractor(501);
        Contractor outsider = contractor(502);
        Worker worker = worker(503, "Review site");
        Worker legacy = worker(504, "Review site");
        Job job = job(owner, "Review site");
        Long id = accept(owner, worker, job);
        applicationRecords.save(new Application(null, job.getJobId(), legacy.getWorkerId(), null, "ACCEPTED"));

        assertThat(reads.ratings(List.of(worker.getWorkerId()))).isEmpty();
        assertThatThrownBy(() -> reviews.save(owner.getPhone(), job.getJobId(), legacy.getWorkerId(), 5, null, false))
                .hasMessageContaining("verified PRESENT");
        var present = allocations.markAttendance(id, owner.getPhone(), today(), Status.PRESENT);
        assertThatThrownBy(() -> reviews.save(outsider.getPhone(), job.getJobId(), worker.getWorkerId(), 4, null, false))
                .hasMessageContaining("Access denied");
        assertThat(race(() -> create(owner, job, worker))).containsExactlyInAnyOrder("created", "duplicate");
        var review = reviews.workerHistory(worker.getPhone()).get(0);
        assertThat(review.createdAt()).isNotNull();
        assertThat(reads.ratings(List.of(worker.getWorkerId())).get(worker.getWorkerId()))
                .isEqualTo(new ReviewReadRepository.Rating(4.0, 1));

        var input = new AttendanceCorrectionInput(Status.ABSENT, present.markedAt(), REASON);
        assertThatThrownBy(() -> allocations.correctAttendance(id, outsider.getPhone(), today(), input))
                .hasMessageContaining("Access denied");
        assertThatThrownBy(() -> allocations.correctAttendance(id, owner.getPhone(), today().minusDays(3), input))
                .hasMessageContaining("allocation schedule");
        assertThatThrownBy(() -> allocations.correctAttendance(id, owner.getPhone(), today(),
                new AttendanceCorrectionInput(Status.ABSENT, present.markedAt(), "............")))
                .hasMessageContaining("meaningful");
        assertThatThrownBy(() -> allocations.markAttendance(id, owner.getPhone(), today(), Status.ABSENT))
                .hasMessageContaining("reasoned correction");
        assertThat(race(() -> {
            try {
                allocations.correctAttendance(id, owner.getPhone(), today(), input);
                return "corrected";
            } catch (IllegalStateException e) {
                if (e.getMessage().contains("changed since")) return "stale";
                throw e;
            }
        })).containsExactlyInAnyOrder("corrected", "stale");

        var event = allocations.attendanceCorrections(id, owner.getPhone(), today()).get(0);
        assertThat(allocations.attendanceCorrections(id, owner.getPhone(), today())).containsExactly(event);
        assertThat(event.previousStatus()).isEqualTo("PRESENT");
        assertThat(event.newStatus()).isEqualTo("ABSENT");
        assertThat(event.reason()).isEqualTo(REASON);
        assertThat(event.contractorId()).isEqualTo(owner.getContractorId());
        assertThat(event.correctedAt()).isAfter(present.markedAt());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM attendance_corrections WHERE id = ? AND previous_actor_id = ?",
                Long.class, event.id(), owner.getContractorId())).isEqualTo(1);
        assertThatThrownBy(() -> jdbc.update("DELETE FROM attendance_corrections WHERE id = ?", event.id()))
                .hasMessageContaining("append-only");
        assertThatThrownBy(() -> jdbc.update("UPDATE attendance_corrections SET reason=? WHERE id=?", REASON + " checked", event.id()))
                .hasMessageContaining("append-only");

        assertThat(reviews.workerHistory(worker.getPhone())).singleElement().satisfies(history -> {
            assertThat(history.reviewId()).isEqualTo(review.reviewId());
            assertThat(history.verified()).isFalse();
        });
        assertThat(reads.ratings(List.of(worker.getWorkerId()))).isEmpty();
        assertThatThrownBy(() -> reviews.save(owner.getPhone(), job.getJobId(), worker.getWorkerId(), 3, null, true))
                .hasMessageContaining("verified PRESENT");

        allocations.markAttendance(id, owner.getPhone(), today().minusDays(1), Status.PRESENT);
        var edit = reviews.save(owner.getPhone(), job.getJobId(), worker.getWorkerId(), 3, "Updated feedback", true);
        assertThat(edit.createdAt()).isEqualTo(review.createdAt());
        assertThat(edit.updatedAt()).isAfter(edit.createdAt());
        Job another = job(owner, "Review site");
        Long second = accept(owner, worker, another);
        allocations.markAttendance(second, owner.getPhone(), today().minusDays(1), Status.PRESENT);
        reviews.save(owner.getPhone(), another.getJobId(), worker.getWorkerId(), 4, null, false);
        assertThat(reads.ratings(List.of(worker.getWorkerId())).get(worker.getWorkerId()))
                .isEqualTo(new ReviewReadRepository.Rating(3.5, 2));
        assertThat(reviews.contractorHistory(outsider.getPhone())).isEmpty();
    }

    @Test
    void replacementCorrectionKeepsConfirmedOfferAndReviewHistory() {
        Contractor owner = contractor(511);
        Contractor outsider = contractor(512);
        Worker absent = worker(513, "Replacement review site");
        Worker replacement = worker(514, "Replacement review site");
        Job job = job(owner, "Replacement review site");
        Long id = accept(owner, absent, job);
        allocations.markAttendance(id, owner.getPhone(), today(), Status.ABSENT);
        var request = replacements.create(owner.getPhone(), id, today());
        var offer = replacements.send(owner.getPhone(), request.requestId(), replacement.getWorkerId());
        replacements.respond(replacement.getPhone(), offer.offerId(), true);
        assertThatThrownBy(() -> reviews.save(owner.getPhone(), job.getJobId(), replacement.getWorkerId(), 4, null, false))
                .hasMessageContaining("verified PRESENT");
        var mark = replacements.mark(owner.getPhone(), request.requestId(), today(), Status.PRESENT);
        reviews.save(owner.getPhone(), job.getJobId(), replacement.getWorkerId(), 4, null, false);
        var input = new AttendanceCorrectionInput(Status.ABSENT, mark.markedAt(), REASON);
        assertThatThrownBy(() -> replacements.correctAttendance(outsider.getPhone(), request.requestId(), today(), input))
                .hasMessageContaining("Access denied");
        assertThatThrownBy(() -> replacements.correctAttendance(owner.getPhone(), request.requestId(), today().minusDays(1), input))
                .hasMessageContaining("coverage date");
        replacements.correctAttendance(owner.getPhone(), request.requestId(), today(), input);
        assertThat(replacements.attendanceCorrections(owner.getPhone(), request.requestId(), today()))
                .singleElement().satisfies(event -> assertThat(event.previousStatus()).isEqualTo("PRESENT"));
        assertThat(replacements.contractorRequests(owner.getPhone())).singleElement()
                .satisfies(row -> assertThat(row.state()).isEqualTo("CONFIRMED"));
        assertThat(replacements.workerOffers(replacement.getPhone()).get(0).acceptedAt()).isEqualTo(mark.acceptedAt());
        assertThat(allocations.contractorAttendance(id, owner.getPhone()).get(0).status()).isEqualTo(Status.ABSENT);
        assertThat(reads.ratings(List.of(replacement.getWorkerId()))).isEmpty();
        assertThat(reviews.workerHistory(replacement.getPhone()).get(0).verified()).isFalse();
    }

    private String create(Contractor owner, Job job, Worker worker) {
        try {
            reviews.save(owner.getPhone(), job.getJobId(), worker.getWorkerId(), 4, "Verified work", false);
            return "created";
        } catch (IllegalStateException e) {
            if (e.getMessage().contains("already exists")) return "duplicate";
            throw e;
        }
    }

    private static List<String> race(Callable<String> action) throws Exception {
        var barrier = new CyclicBarrier(2);
        var pool = Executors.newFixedThreadPool(2);
        try {
            Callable<String> competing = () -> { barrier.await(10, TimeUnit.SECONDS); return action.call(); };
            var first = pool.submit(competing);
            var second = pool.submit(competing);
            return List.of(first.get(20, TimeUnit.SECONDS), second.get(20, TimeUnit.SECONDS));
        } finally {
            pool.shutdownNow();
        }
    }

    private Long accept(Contractor owner, Worker worker, Job job) {
        var pending = applications.applyForJob(job.getJobId(), worker.getPhone());
        applications.updateStatus(pending.getApplicationId(), "ACCEPTED", owner.getPhone());
        return allocations.contractorAllocations(owner.getPhone()).stream().filter(row -> row.jobId().equals(job.getJobId()))
                .findFirst().orElseThrow().allocationId();
    }

    private Contractor contractor(int number) {
        var record = new Contractor("Scratch owner", "Scratch team", String.format("%010d", number), "Scratch");
        record.setPassword("fixture-only");
        return contractors.save(record);
    }

    private Worker worker(int number, String site) {
        var record = new Worker(null, "Scratch worker", String.format("%010d", number), "fixture-only", "Mason", 5, site, true);
        record.setExpectedWagePerDay(500.0);
        return workers.save(record);
    }

    private Job job(Contractor owner, String site) {
        var record = new Job(null, "Scratch job", "", "Mason", site, 600.0, 2, "OPEN", owner.getContractorId());
        record.setStartDate(today().minusDays(1));
        record.setEndDate(today());
        return jobs.save(record);
    }

    private static LocalDate today() { return LocalDate.now(ZoneId.of("Asia/Kolkata")); }
}
