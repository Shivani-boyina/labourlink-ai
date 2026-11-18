package com.labourlink.labourlinkai.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "attendance_corrections")
public class AttendanceCorrection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long attendanceId;
    private Long coverageId;
    private LocalDate workDate;
    private String previousStatus;
    private String newStatus;
    private String reason;
    private Long previousActorId;
    @Column(columnDefinition = "datetime(6)")
    private Instant previousMarkedAt;
    private Long contractorId;
    @Column(columnDefinition = "datetime(6)")
    private Instant correctedAt;

    protected AttendanceCorrection() {
    }

    public AttendanceCorrection(Long attendanceId, Long coverageId, LocalDate date, DailyAttendance.Status previous,
                                DailyAttendance.Status next, String reason, Long previousActorId,
                                Instant previousMarkedAt, Long contractorId, Instant correctedAt) {
        this.attendanceId = attendanceId;
        this.coverageId = coverageId;
        this.workDate = date;
        this.previousStatus = previous.name();
        this.newStatus = next.name();
        this.reason = reason;
        this.previousActorId = previousActorId;
        this.previousMarkedAt = previousMarkedAt;
        this.contractorId = contractorId;
        this.correctedAt = correctedAt;
    }

    public Long getId() { return id; }
    public LocalDate getWorkDate() { return workDate; }
    public String getPreviousStatus() { return previousStatus; }
    public String getNewStatus() { return newStatus; }
    public String getReason() { return reason; }
    public Long getContractorId() { return contractorId; }
    public Instant getCorrectedAt() { return correctedAt; }
}
