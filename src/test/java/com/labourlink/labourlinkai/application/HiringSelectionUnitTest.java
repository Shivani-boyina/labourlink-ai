package com.labourlink.labourlinkai.application;

import com.labourlink.labourlinkai.entity.Application;
import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.service.ApplicationServiceImpl;
import com.labourlink.labourlinkai.service.AllocationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class HiringSelectionUnitTest {
    @Mock ApplicationRepository applications;
    @Mock JobRepository jobs;
    @Mock WorkerRepository workers;
    @Mock ContractorRepository contractors;
    @Mock AllocationService allocations;
    @InjectMocks ApplicationServiceImpl service;

    private final Job job = new Job(10L, "Job", "", "Mason", "Town", 500.0, 1, "OPEN", 20L);
    private final Application application = new Application(30L, 10L, 40L, "2026-06-19", "PENDING");
    private final Contractor contractor = new Contractor();

    @BeforeEach
    void findContractor() {
        contractor.setContractorId(20L);
        when(contractors.findByPhone("owner")).thenReturn(Optional.of(contractor));
        when(applications.findJobIdByApplicationId(30L)).thenReturn(Optional.of(10L));
        when(jobs.findByIdForUpdate(10L)).thenReturn(Optional.of(job));
    }

    @Test
    void newAcceptanceKeepsSubmissionDateAndRecordsSelectionTimestamp() {
        pendingApplication();
        workerAvailability(true);
        when(applications.save(application)).thenReturn(application);
        Instant start = Instant.now().minusMillis(1);
        var result = service.updateStatus(30L, "accepted", "owner");
        assertThat(result.getApplicationDate()).isEqualTo("2026-06-19");
        assertThat(result.getAcceptedAt()).isBetween(start, Instant.now());
        assertThat(result.getStatus()).isEqualTo("ACCEPTED");
        assertThat(service.updateStatus(30L, "ACCEPTED", "owner").getAcceptedAt()).isEqualTo(result.getAcceptedAt());
        verify(applications).save(application);
    }

    @Test
    void historicAcceptedRecordKeepsUnknownSelectionDate() {
        pendingApplication();
        application.setStatus("ACCEPTED");
        assertThat(service.updateStatus(30L, "ACCEPTED", "owner").getAcceptedAt()).isNull();
        verify(applications, never()).save(any());
    }

    @Test
    void deniesNonOwnerBeforeLockingOrWritingApplication() {
        contractor.setContractorId(99L);
        assertThatThrownBy(() -> service.updateStatus(30L, "ACCEPTED", "owner")).hasMessageContaining("do not own");
        verify(applications, never()).findByIdForUpdate(30L);
        verify(applications, never()).save(any());
    }

    @Test
    void doesNotAcceptBeyondCapacity() {
        pendingApplication();
        workerAvailability(true);
        when(applications.countOccupyingSlots(10L)).thenReturn(1L);
        assertThatThrownBy(() -> service.updateStatus(30L, "ACCEPTED", "owner")).hasMessage("Job capacity full");
        assertThat(application.getAcceptedAt()).isNull();
        verify(applications, never()).save(any());
    }

    @Test
    void unavailableWorkerRemainsPendingWithoutAnAllocation() {
        pendingApplication();
        workerAvailability(false);
        assertThatThrownBy(() -> service.updateStatus(30L, "ACCEPTED", "owner"))
                .hasMessageContaining("worker is unavailable");
        assertThat(application.getStatus()).isEqualTo("PENDING");
        assertThat(application.getAcceptedAt()).isNull();
        verify(applications, never()).save(any());
        verifyNoInteractions(allocations);
    }

    private void workerAvailability(boolean available) {
        Worker worker = new Worker();
        worker.setAvailability(available);
        when(workers.findForUpdate(40L)).thenReturn(Optional.of(worker));
    }

    @Test
    void closedJobCannotAcceptNewWorker() {
        pendingApplication();
        job.setStatus("CLOSED");
        assertThatThrownBy(() -> service.updateStatus(30L, "ACCEPTED", "owner")).hasMessageContaining("closed");
        verify(applications, never()).save(any());
    }

    private void pendingApplication() {
        when(applications.findByIdForUpdate(30L)).thenReturn(Optional.of(application));
    }
}
