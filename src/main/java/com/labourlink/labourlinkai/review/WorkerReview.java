package com.labourlink.labourlinkai.review;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "worker_reviews")
public class WorkerReview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;
    Long jobId;
    Long workerId;
    Long contractorId;
    Integer rating;
    @Column(length = 1000)
    String feedback;
    LocalDate evidenceDate;
    Long attendanceId;
    Long coverageId;
    @Column(columnDefinition = "datetime(6)")
    Instant createdAt;
    @Column(columnDefinition = "datetime(6)")
    Instant updatedAt;

    protected WorkerReview() {
    }

    WorkerReview(Long jobId, Long workerId, Long contractorId, WorkerReviewRepository.Evidence evidence, Instant at) {
        this.jobId = jobId;
        this.workerId = workerId;
        this.contractorId = contractorId;
        this.evidenceDate = evidence.date();
        this.attendanceId = evidence.attendanceId();
        this.coverageId = evidence.coverageId();
        this.createdAt = at;
    }
}
