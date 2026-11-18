package com.labourlink.labourlinkai.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "worker_allocations", uniqueConstraints = {
        @UniqueConstraint(columnNames = "application_id"),
        @UniqueConstraint(columnNames = {"job_id", "worker_id"})
})
public class WorkerAllocation {
    public enum Status { ACTIVE, COMPLETED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long allocationId;
    @Column(nullable = false)
    private Long applicationId;
    @Column(nullable = false)
    private Long jobId;
    @Column(nullable = false)
    private Long workerId;
    @Column(nullable = false)
    private Long contractorId;
    @Column(nullable = false, columnDefinition = "datetime(6)")
    private Instant allocatedAt;
    private LocalDate startDate;
    private LocalDate endDate;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 16)
    private Status status;

    protected WorkerAllocation() {
    }

    public WorkerAllocation(Application application, Job job) {
        applicationId = application.getApplicationId();
        jobId = job.getJobId();
        workerId = application.getWorkerId();
        contractorId = job.getContractorId();
        allocatedAt = application.getAcceptedAt();
        startDate = job.getStartDate();
        endDate = job.getEndDate();
        status = Status.ACTIVE;
    }

    public Long getAllocationId() { return allocationId; }
    public Long getJobId() { return jobId; }
    public Long getWorkerId() { return workerId; }
    public Long getContractorId() { return contractorId; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public Status getStatus() { return status; }

    public void setSchedule(LocalDate startDate, LocalDate endDate) {
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public void setStatus(Status status) { this.status = status; }
}
