package com.labourlink.labourlinkai.analytics;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface AnalyticsRunRepository extends JpaRepository<AnalyticsValidationRun, String> {
    Optional<AnalyticsValidationRun> findFirstByOrderByStartedAtDesc();
}
