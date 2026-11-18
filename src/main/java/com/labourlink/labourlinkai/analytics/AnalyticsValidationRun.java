package com.labourlink.labourlinkai.analytics;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "analytics_validation_runs")
public class AnalyticsValidationRun {
    @Id public String id;
    public String status;
    public Instant startedAt;
    public Instant completedAt;
    @Lob @Column(columnDefinition = "LONGTEXT") public String report;
    public String error;
    protected AnalyticsValidationRun() {}
    AnalyticsValidationRun(String id) {
        this.id = id;
        this.status = "RUNNING";
        this.startedAt = Instant.now();
    }
}
