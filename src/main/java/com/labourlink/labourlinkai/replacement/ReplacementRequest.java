package com.labourlink.labourlinkai.replacement;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "replacement_requests")
public class ReplacementRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    Long allocationId;
    Long absenceId;
    LocalDate workDate;
    @Column(columnDefinition = "datetime(6)")
    Instant requestedAt;
    @Column(columnDefinition = "datetime(6)")
    Instant absenceMarkedAt;
    @Column(columnDefinition = "datetime(6)")
    Instant cancelledAt;
    protected ReplacementRequest() {
    }

    ReplacementRequest(Long allocationId, Long absenceId, LocalDate workDate, Instant requestedAt, Instant absenceMarkedAt) {
        this.allocationId = allocationId;
        this.absenceId = absenceId;
        this.workDate = workDate;
        this.requestedAt = requestedAt;
        this.absenceMarkedAt = absenceMarkedAt;
    }
}
