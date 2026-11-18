package com.labourlink.labourlinkai.application;

import com.labourlink.labourlinkai.TestDatabaseSafetyInitializer;
import com.labourlink.labourlinkai.TestPhoneNumbers;
import com.labourlink.labourlinkai.dto.ApplicationResponseDTO;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionInput;
import com.labourlink.labourlinkai.entity.Application;
import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.DailyAttendance;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.entity.WorkerAllocation;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.repository.WorkerAllocationRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.service.AllocationService;
import com.labourlink.labourlinkai.service.ApplicationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@EnabledIfEnvironmentVariable(named = "LABOURLINK_BATCH105_PIPE", matches = "LabourLinkRestore_[a-f0-9]{32}")
@SpringBootTest
@ContextConfiguration(initializers = TestDatabaseSafetyInitializer.class)
class IsolatedAllocationMySqlTest {
    @Autowired ApplicationService applications;
    @Autowired AllocationService allocations;
    @Autowired ApplicationRepository applicationRecords;
    @Autowired WorkerAllocationRepository allocationRecords;
    @Autowired JobRepository jobs;
    @Autowired WorkerRepository workers;
    @Autowired ContractorRepository contractors;

    @Test
    void finalSlotIsSerializedAndRepeatedAcceptanceKeepsOneAllocation() throws Exception {
        Contractor owner = contractor("0000000101");
        Worker first = worker("0000000102");
        Worker second = worker("0000000103");
        Job job = job(owner, 1, false);
        var one = applications.applyForJob(job.getJobId(), first.getPhone());
        var two = applications.applyForJob(job.getJobId(), second.getPhone());
        var pool = Executors.newFixedThreadPool(2);
        var ready = new CountDownLatch(2);
        var start = new CountDownLatch(1);
        try {
            var outcomes = List.of(one, two).stream().map(pending -> pool.submit(() -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Start timed out");
                try {
                    applications.updateStatus(pending.getApplicationId(), "ACCEPTED", owner.getPhone());
                    return "accepted";
                } catch (RuntimeException error) {
                    if ("Job capacity full".equals(error.getMessage())) return "full";
                    throw error;
                }
            })).toList();
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(List.of(outcomes.get(0).get(15, TimeUnit.SECONDS), outcomes.get(1).get(15, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder("accepted", "full");
        } finally {
            pool.shutdownNow();
            pool.awaitTermination(15, TimeUnit.SECONDS);
        }

        var selected = allocations.contractorAllocations(owner.getPhone());
        assertThat(selected).hasSize(1);
        var row = selected.get(0);
        assertThat(applicationRecords.countOccupyingSlots(job.getJobId())).isEqualTo(1);
        ApplicationResponseDTO again = applications.updateStatus(row.applicationId(), "ACCEPTED", owner.getPhone());
        assertThat(again.getAcceptedAt()).isEqualTo(row.allocatedAt());
        assertThat(again.getAllocationStatus()).isEqualTo(WorkerAllocation.Status.ACTIVE);
        assertThat(allocations.contractorAllocations(owner.getPhone())).containsExactly(row);
        assertThat(allocations.contractorAttendance(row.allocationId(), owner.getPhone())).isEmpty();
        assertThatThrownBy(() -> allocations.markAttendance(row.allocationId(), owner.getPhone(), today(),
                DailyAttendance.Status.PRESENT)).hasMessageContaining("Confirm the allocation schedule");
        allocations.setSchedule(row.allocationId(), owner.getPhone(), today(), today());
        allocations.changeStatus(row.allocationId(), owner.getPhone(), WorkerAllocation.Status.CANCELLED);
        assertThat(applicationRecords.countOccupyingSlots(job.getJobId())).isZero();
        assertThat(applicationRecords.findById(row.applicationId()).orElseThrow().getStatus()).isEqualTo("ACCEPTED");
        assertThat(applications.updateStatus(row.applicationId(), "ACCEPTED", owner.getPhone()).getAllocationStatus())
                .isEqualTo(WorkerAllocation.Status.CANCELLED);
    }

    @Test
    void unavailableWorkerCannotBeAllocatedAndExistingAcceptanceRemainsIdempotent() {
        Contractor owner = contractor(TestPhoneNumbers.next());
        Worker available = worker(TestPhoneNumbers.next());
        Worker unavailable = worker(TestPhoneNumbers.next());
        Job job = job(owner, 2, true);
        var accepted = applications.applyForJob(job.getJobId(), available.getPhone());
        applications.updateStatus(accepted.getApplicationId(), "ACCEPTED", owner.getPhone());
        var pending = applications.applyForJob(job.getJobId(), unavailable.getPhone());
        unavailable.setAvailability(false);
        workers.save(unavailable);

        assertThatThrownBy(() -> applications.updateStatus(pending.getApplicationId(), "ACCEPTED", owner.getPhone()))
                .hasMessageContaining("worker is unavailable");
        var unchanged = applicationRecords.findById(pending.getApplicationId()).orElseThrow();
        assertThat(unchanged.getStatus()).isEqualTo("PENDING");
        assertThat(unchanged.getAcceptedAt()).isNull();

        available.setAvailability(false);
        workers.save(available);
        assertThat(applications.updateStatus(accepted.getApplicationId(), "ACCEPTED", owner.getPhone()).getAllocationStatus())
                .isEqualTo(WorkerAllocation.Status.ACTIVE);
        assertThat(allocations.contractorAllocations(owner.getPhone()))
                .extracting(row -> row.applicationId()).containsExactly(accepted.getApplicationId());
        assertThat(applicationRecords.countOccupyingSlots(job.getJobId())).isEqualTo(1);
    }

    @Test
    void attendanceIsScopedValidatedAndUpdatedOncePerDay() {
        Contractor owner = contractor("0000000201");
        Contractor other = contractor("0000000202");
        Worker worker = worker("0000000203");
        Worker outsider = worker("0000000204");
        Job job = job(owner, 2, true);
        var pending = applications.applyForJob(job.getJobId(), worker.getPhone());
        assertThatThrownBy(() -> applications.applyForJob(job.getJobId(), worker.getPhone()))
                .hasMessageContaining("already applied");
        applications.updateStatus(pending.getApplicationId(), "ACCEPTED", owner.getPhone());
        Long id = allocations.contractorAllocations(owner.getPhone()).get(0).allocationId();

        assertThatThrownBy(() -> allocations.markAttendance(id, other.getPhone(), today(), DailyAttendance.Status.PRESENT))
                .hasMessageContaining("Access denied");
        assertThatThrownBy(() -> allocations.workerAttendance(id, outsider.getPhone())).hasMessageContaining("Access denied");
        assertThatThrownBy(() -> allocations.markAttendance(id, owner.getPhone(), today().minusDays(3), DailyAttendance.Status.ABSENT))
                .hasMessageContaining("allocation schedule");
        assertThatThrownBy(() -> allocations.markAttendance(id, owner.getPhone(), today().plusDays(1), DailyAttendance.Status.PRESENT))
                .hasMessageContaining("future");

        var pendingMark = allocations.markAttendance(id, owner.getPhone(), today(), DailyAttendance.Status.PENDING);
        var present = allocations.markAttendance(id, owner.getPhone(), today().minusDays(1), DailyAttendance.Status.PRESENT);
        var absent = allocations.correctAttendance(id, owner.getPhone(), today(), new AttendanceCorrectionInput(
                DailyAttendance.Status.ABSENT, pendingMark.markedAt(), "Attendance sheet confirmed absence"));
        assertThat(absent.markedAt()).isAfterOrEqualTo(pendingMark.markedAt());
        assertThat(absent.markedByContractorId()).isEqualTo(owner.getContractorId());
        assertThat(allocations.workerAttendance(id, worker.getPhone())).containsExactly(absent, present);
        allocations.changeStatus(id, owner.getPhone(), WorkerAllocation.Status.COMPLETED);
        assertThatThrownBy(() -> allocations.markAttendance(id, owner.getPhone(), today(), DailyAttendance.Status.PRESENT))
                .hasMessageContaining("no longer active");
        assertThat(applicationRecords.countOccupyingSlots(job.getJobId())).isEqualTo(1);
    }

    @Test
    void legacyAcceptedRowsKeepCapacityWithoutCreatingAllocations() {
        Contractor owner = contractor("0000000301");
        Worker worker = worker("0000000302");
        Job job = job(owner, 1, true);
        long countBefore = allocationRecords.count();
        var record = applicationRecords.save(new Application(null, job.getJobId(), worker.getWorkerId(), null, "ACCEPTED"));
        assertThat(applications.updateStatus(record.getApplicationId(), "ACCEPTED", owner.getPhone()).getAcceptedAt()).isNull();
        assertThat(allocationRecords.count()).isEqualTo(countBefore);
        assertThat(applicationRecords.countOccupyingSlots(job.getJobId())).isEqualTo(1);
    }

    private Contractor contractor(String phone) {
        var contractor = new Contractor("Scratch fixture", "Scratch fixture", phone, "Test site");
        contractor.setPassword("fixture-only");
        return contractors.save(contractor);
    }

    private Worker worker(String phone) {
        return workers.save(new Worker(null, "Scratch fixture", phone, "fixture-only", "Mason", 1, "Test site", true));
    }

    private Job job(Contractor owner, int limit, boolean scheduled) {
        var job = new Job(null, "Scratch fixture", "", "Mason", "Test site", 600.0, limit, "OPEN", owner.getContractorId());
        if (scheduled) {
            job.setStartDate(today().minusDays(1));
            job.setEndDate(today().plusDays(1));
        }
        return jobs.save(job);
    }

    private static LocalDate today() { return LocalDate.now(ZoneId.of("Asia/Kolkata")); }
}
