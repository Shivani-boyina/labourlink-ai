package com.labourlink.labourlinkai.replacement;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import com.labourlink.labourlinkai.entity.DailyAttendance;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "replacement_coverage")
public class ReplacementCoverage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    Long id;

    Long requestId;
    Long offerId;
    Long workerId;
    LocalDate workDate;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(length = 16)
    DailyAttendance.Status attendanceStatus;
    Long markedByContractorId;
    @Column(columnDefinition = "datetime(6)")
    Instant markedAt;
    protected ReplacementCoverage() {
    }

    ReplacementCoverage(Long requestId, Long offerId, Long workerId, LocalDate workDate) {
        this.requestId = requestId;
        this.offerId = offerId;
        this.workerId = workerId;
        this.workDate = workDate;
    }
}
