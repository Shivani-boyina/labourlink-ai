package com.labourlink.labourlinkai.replacement;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface ReplacementCoverageRepository extends JpaRepository<ReplacementCoverage, Long> {
    Optional<ReplacementCoverage> findByRequestId(Long requestId);
    boolean existsByWorkerIdAndWorkDate(Long workerId, LocalDate workDate);
    boolean existsByWorkerIdAndWorkDateBetween(Long workerId, LocalDate start, LocalDate end);
    boolean existsByWorkerIdAndWorkDateGreaterThanEqual(Long workerId, LocalDate date);

}
