package com.labourlink.labourlinkai.replacement;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface ReplacementRequestRepository extends JpaRepository<ReplacementRequest, Long> {
    Optional<ReplacementRequest> findByAllocationIdAndWorkDate(Long allocationId, LocalDate workDate);
}
