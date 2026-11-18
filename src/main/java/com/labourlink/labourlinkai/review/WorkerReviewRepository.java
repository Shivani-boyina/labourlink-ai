package com.labourlink.labourlinkai.review;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface WorkerReviewRepository extends JpaRepository<WorkerReview, Long> {
    record Evidence(LocalDate date, Long attendanceId, Long coverageId) {}
    Optional<WorkerReview> findByJobIdAndWorkerIdAndContractorId(Long jobId, Long workerId, Long contractorId);
}
