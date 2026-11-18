package com.labourlink.labourlinkai.replacement;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReplacementOfferRepository extends JpaRepository<ReplacementOffer, Long> {
    List<ReplacementOffer> findByRequestIdOrderById(Long requestId);
    List<ReplacementOffer> findByWorkerIdOrderByIdDesc(Long workerId);
    boolean existsByRequestIdAndWorkerId(Long requestId, Long workerId);
}
