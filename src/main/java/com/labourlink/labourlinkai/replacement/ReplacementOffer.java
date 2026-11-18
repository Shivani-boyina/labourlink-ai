package com.labourlink.labourlinkai.replacement;

import jakarta.persistence.*;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "replacement_offers")
public class ReplacementOffer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    Long requestId;
    Long workerId;
    String jobLocation;
    Double dailyWage;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(length = 16)
    OfferState state;
    @Column(columnDefinition = "datetime(6)")
    Instant offeredAt;
    @Column(columnDefinition = "datetime(6)")
    Instant expiresAt;
    @Column(columnDefinition = "datetime(6)")
    Instant acceptedAt;
    @Column(columnDefinition = "datetime(6)")
    Instant declinedAt;
    @Column(columnDefinition = "datetime(6)")
    Instant cancelledAt;
    protected ReplacementOffer() {
    }

    ReplacementOffer(Long requestId, Long workerId, String jobLocation, Double dailyWage,
                     Instant offeredAt, Instant expiresAt) {
        this.requestId = requestId;
        this.workerId = workerId;
        this.jobLocation = jobLocation;
        this.dailyWage = dailyWage;
        this.offeredAt = offeredAt;
        this.expiresAt = expiresAt;
        this.state = OfferState.PENDING;
    }
}
