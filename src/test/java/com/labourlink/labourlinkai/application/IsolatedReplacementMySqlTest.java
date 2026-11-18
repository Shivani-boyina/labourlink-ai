package com.labourlink.labourlinkai.application;

import com.labourlink.labourlinkai.TestDatabaseSafetyInitializer;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionInput;
import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.DailyAttendance;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.entity.WorkerAllocation;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.replacement.OfferState;
import com.labourlink.labourlinkai.replacement.ReplacementService;
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ContextConfiguration(initializers = TestDatabaseSafetyInitializer.class)
@EnabledIfEnvironmentVariable(named = "LABOURLINK_BATCH105_PIPE", matches = "LabourLinkRestore_[a-f0-9]{32}")
class IsolatedReplacementMySqlTest {
    @Autowired ReplacementService replacements;
    @Autowired ApplicationService applications;
    @Autowired AllocationService allocations;
    @Autowired ApplicationRepository applicationRecords;
    @Autowired WorkerRepository workers;
    @Autowired ContractorRepository contractors;
    @Autowired JobRepository jobs;
    @Autowired JdbcTemplate jdbc;

    @Test
    void competesForOneAbsenceAndPreservesSeparateAttendanceAndCapacity() throws Exception {
        var fixture = fixture(401);
        var first = worker(402, "Coverage Site 401", 500.0);
        var second = worker(403, "Coverage Site 401", 500.0);
        var wrongLocation = worker(404, "Elsewhere", 500.0);
        var tooExpensive = worker(405, "Coverage Site 401", 900.0);
        var conflicting = worker(406, "Coverage Site 401", 500.0);
        Long otherJob = job(fixture.owner(), "Coverage Site 401");
        accept(fixture.owner(), conflicting, otherJob);

        assertThatThrownBy(() -> replacements.create(fixture.owner().getPhone(), fixture.allocationId(), today()))
                .hasMessageContaining("verified ABSENT");
        markOriginal(fixture, DailyAttendance.Status.ABSENT);
        assertThat(replacements.absences(fixture.owner().getPhone()))
                .anyMatch(absence -> absence.allocationId().equals(fixture.allocationId()) && absence.requestable());
        var request = replacements.create(fixture.owner().getPhone(), fixture.allocationId(), today());
        assertThat(replacements.create(fixture.owner().getPhone(), fixture.allocationId(), today()).requestId())
                .isEqualTo(request.requestId());
        assertThat(replacements.recommendations(fixture.owner().getPhone(), request.requestId()))
                .extracting(ReplacementService.Candidate::workerId)
                .contains(first.getWorkerId(), second.getWorkerId())
                .doesNotContain(fixture.absent().getWorkerId(), wrongLocation.getWorkerId(), tooExpensive.getWorkerId(), conflicting.getWorkerId());
        assertThatThrownBy(() -> replacements.mark(fixture.owner().getPhone(), request.requestId(), today(), DailyAttendance.Status.PRESENT))
                .hasMessageContaining("not confirmed");
        var offer1 = replacements.send(fixture.owner().getPhone(), request.requestId(), first.getWorkerId());
        var offer2 = replacements.send(fixture.owner().getPhone(), request.requestId(), second.getWorkerId());
        assertThatThrownBy(() -> replacements.respond(first.getPhone(), offer2.offerId(), true))
                .hasMessageContaining("Access denied");

        var executor = Executors.newFixedThreadPool(2);
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        List<String> outcomes;
        try {
            var f1 = executor.submit(() -> decide(first, offer1, ready, start));
            var f2 = executor.submit(() -> decide(second, offer2, ready, start));
            assertThat(ready.await(8, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            outcomes = List.of(f1.get(15, TimeUnit.SECONDS), f2.get(15, TimeUnit.SECONDS));
        } finally {
            executor.shutdownNow();
        }
        assertThat(outcomes).containsExactlyInAnyOrder("ACCEPTED", "CANCELLED");
        Worker winner = outcomes.get(0).equals("ACCEPTED") ? first : second;
        var winningOffer = outcomes.get(0).equals("ACCEPTED") ? offer1 : offer2;
        var confirmed = replacements.respond(winner.getPhone(), winningOffer.offerId(), true);
        assertThat(confirmed.attendanceStatus()).isNull();
        assertThat(replacements.respond(winner.getPhone(), winningOffer.offerId(), true).acceptedAt()).isEqualTo(confirmed.acceptedAt());
        assertThatThrownBy(() -> replacements.mark(fixture.owner().getPhone(), request.requestId(), today().minusDays(1),
                DailyAttendance.Status.PRESENT)).hasMessageContaining("coverage date");

        var mark = replacements.mark(fixture.owner().getPhone(), request.requestId(), today(), DailyAttendance.Status.PRESENT);
        assertThat(replacements.mark(fixture.owner().getPhone(), request.requestId(), today(), DailyAttendance.Status.PRESENT).markedAt())
                .isEqualTo(mark.markedAt());
        assertThatThrownBy(() -> replacements.mark(fixture.owner().getPhone(), request.requestId(), today(), DailyAttendance.Status.ABSENT))
                .hasMessageContaining("already been recorded");
        assertThat(replacements.workerOffers(winner.getPhone())).extracting(ReplacementService.OfferView::attendanceStatus)
                .contains(DailyAttendance.Status.PRESENT);
        assertThat(allocations.contractorAttendance(fixture.allocationId(), fixture.owner().getPhone()).get(0).status())
                .isEqualTo(DailyAttendance.Status.ABSENT);
        assertThat(allocations.contractorAllocations(fixture.owner().getPhone())).filteredOn(a -> a.allocationId().equals(fixture.allocationId()))
                .extracting(a -> a.status()).containsExactly(WorkerAllocation.Status.ACTIVE);
        assertThat(applicationRecords.countOccupyingSlots(fixture.jobId())).isEqualTo(1);
        long coverageCount = jdbc.queryForObject("SELECT COUNT(*) FROM replacement_coverage WHERE request_id = ?", Long.class, request.requestId());
        assertThat(coverageCount).isEqualTo(1);

        var conflictingApplication = applications.applyForJob(job(fixture.owner(), "Coverage Site 401"), winner.getPhone());
        assertThatThrownBy(() -> applications.updateStatus(conflictingApplication.getApplicationId(), "ACCEPTED", fixture.owner().getPhone()))
                .hasMessageContaining("Replacement coverage conflicts");
        assertThat(applicationRecords.findById(conflictingApplication.getApplicationId()).orElseThrow().getStatus())
                .isEqualTo("PENDING");
    }

    @Test
    void retainsDeclineCancellationAndExpiryAndRejectsForeignContractor() {
        var fixture = fixture(421);
        var outsider = contractor(425);
        var one = worker(422, "Coverage Site 421", 500.0);
        var two = worker(423, "Coverage Site 421", 500.0);
        var three = worker(424, "Coverage Site 421", 500.0);
        markOriginal(fixture, DailyAttendance.Status.ABSENT);
        assertThatThrownBy(() -> replacements.create(outsider.getPhone(), fixture.allocationId(), today()))
                .hasMessageContaining("Access denied");
        var request = replacements.create(fixture.owner().getPhone(), fixture.allocationId(), today());
        assertThatThrownBy(() -> replacements.recommendations(outsider.getPhone(), request.requestId()))
                .hasMessageContaining("Access denied");

        var declined = replacements.send(fixture.owner().getPhone(), request.requestId(), one.getWorkerId());
        assertThat(replacements.respond(one.getPhone(), declined.offerId(), false).declinedAt()).isNotNull();
        assertThatThrownBy(() -> replacements.respond(one.getPhone(), declined.offerId(), true)).hasMessageContaining("DECLINED");

        var cancelled = replacements.send(fixture.owner().getPhone(), request.requestId(), two.getWorkerId());
        assertThat(replacements.cancelOffer(fixture.owner().getPhone(), request.requestId(), cancelled.offerId()).cancelledAt()).isNotNull();
        assertThatThrownBy(() -> replacements.respond(two.getPhone(), cancelled.offerId(), true)).hasMessageContaining("CANCELLED");

        var expired = replacements.send(fixture.owner().getPhone(), request.requestId(), three.getWorkerId());
        jdbc.update("UPDATE replacement_offers SET offered_at=UTC_TIMESTAMP(6)-INTERVAL 2 MINUTE, expires_at=UTC_TIMESTAMP(6)-INTERVAL 1 MINUTE WHERE id=?", expired.offerId());
        assertThat(replacements.workerOffers(three.getPhone())).extracting(ReplacementService.OfferView::state).contains(OfferState.EXPIRED);
        assertThatThrownBy(() -> replacements.respond(three.getPhone(), expired.offerId(), true)).hasMessageContaining("EXPIRED");
        assertThat(replacements.cancelRequest(fixture.owner().getPhone(), request.requestId()).state()).isEqualTo("CANCELLED");
    }

    @Test
    void termsAndAbsenceAreRecheckedBeforeWorkerAcceptance() {
        var fixture = fixture(441);
        var worker = worker(442, "Coverage Site 441", 500.0);
        markOriginal(fixture, DailyAttendance.Status.ABSENT);
        var request = replacements.create(fixture.owner().getPhone(), fixture.allocationId(), today());
        var offer = replacements.send(fixture.owner().getPhone(), request.requestId(), worker.getWorkerId());
        var job = jobs.findById(fixture.jobId()).orElseThrow();
        job.setWagePerDay(650.0);
        jobs.save(job);
        assertThat(replacements.workerOffers(worker.getPhone())).extracting(ReplacementService.OfferView::dailyWage)
                .containsExactly(600.0);
        assertThatThrownBy(() -> replacements.respond(worker.getPhone(), offer.offerId(), true))
                .hasMessageContaining("changed after this offer");
        markOriginal(fixture, DailyAttendance.Status.PRESENT);
        assertThatThrownBy(() -> replacements.respond(worker.getPhone(), offer.offerId(), true))
                .hasMessageContaining("verified ABSENT");
    }

    private String decide(Worker worker, ReplacementService.OfferView offer, CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown();
        if (!start.await(8, TimeUnit.SECONDS)) throw new IllegalStateException("Start timed out");
        try {
            return replacements.respond(worker.getPhone(), offer.offerId(), true).state().name();
        } catch (IllegalStateException error) {
            if ("Offer is no longer pending (CANCELLED)".equals(error.getMessage())) return "CANCELLED";
            throw error;
        }
    }

    private record Fixture(Contractor owner, Worker absent, Long jobId, Long allocationId) {}
    private void markOriginal(Fixture fixture, DailyAttendance.Status status) {
        var current = allocations.contractorAttendance(fixture.allocationId(), fixture.owner().getPhone()).get(0);
        allocations.correctAttendance(fixture.allocationId(), fixture.owner().getPhone(), today(),
                new AttendanceCorrectionInput(status, current.markedAt(), "Verified result against the attendance sheet"));
    }

    private Fixture fixture(int id) {
        var owner = contractor(id);
        String site = "Coverage Site " + id;
        var absent = worker(id, site, 550.0);
        Long jobId = job(owner, site);
        accept(owner, absent, jobId);
        Long allocationId = allocations.contractorAllocations(owner.getPhone()).get(0).allocationId();
        allocations.markAttendance(allocationId, owner.getPhone(), today(), DailyAttendance.Status.PENDING);
        return new Fixture(owner, absent, jobId, allocationId);
    }

    private void accept(Contractor owner, Worker worker, Long jobId) {
        var application = applications.applyForJob(jobId, worker.getPhone());
        applications.updateStatus(application.getApplicationId(), "ACCEPTED", owner.getPhone());
    }

    private Contractor contractor(int id) {
        var c = new Contractor("Scratch contractor", "Scratch fixture", String.format("%010d", id), "Scratch");
        c.setPassword("fixture-only");
        return contractors.save(c);
    }

    private Worker worker(int id, String location, double wage) {
        var w = new Worker(null, "Scratch worker", String.format("%010d", id), "fixture-only", "Mason", 4, location, true);
        w.setExpectedWagePerDay(wage);
        return workers.save(w);
    }

    private Long job(Contractor contractor, String location) {
        var job = new Job(null, "Scratch job", "", "Mason", location, 600.0, 1, "OPEN", contractor.getContractorId());
        job.setMinimumExperience(3);
        job.setStartDate(today().minusDays(1));
        job.setEndDate(today().plusDays(1));
        return jobs.save(job).getJobId();
    }

    private static LocalDate today() { return LocalDate.now(ZoneId.of("Asia/Kolkata")); }
}
