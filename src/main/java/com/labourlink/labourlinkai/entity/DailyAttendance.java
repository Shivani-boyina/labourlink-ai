package com.labourlink.labourlinkai.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "daily_attendance", uniqueConstraints = @UniqueConstraint(columnNames = {"allocation_id", "work_date"}))
public class DailyAttendance {
    public enum Status { PRESENT, ABSENT, PENDING }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long attendanceId;
    @Column(nullable = false)
    private Long allocationId;
    @Column(nullable = false)
    private LocalDate workDate;
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 16)
    private Status status;
    @Column(nullable = false)
    private Long markedByContractorId;
    @Column(nullable = false, columnDefinition = "datetime(6)")
    private Instant markedAt;

    protected DailyAttendance() {
    }

    public DailyAttendance(Long allocationId, LocalDate workDate) {
        this.allocationId = allocationId;
        this.workDate = workDate;
    }

    public void mark(Status status, Long contractorId) {
        mark(status, contractorId, Instant.now().truncatedTo(ChronoUnit.MICROS));
    }

    public void mark(Status status, Long contractorId, Instant timestamp) {
        this.status = status;
        markedByContractorId = contractorId;
        markedAt = timestamp;
    }

    public LocalDate getWorkDate() { return workDate; }
    public Long getAttendanceId() { return attendanceId; }
    public Status getStatus() { return status; }
    public Long getMarkedByContractorId() { return markedByContractorId; }
    public Instant getMarkedAt() { return markedAt; }
}
