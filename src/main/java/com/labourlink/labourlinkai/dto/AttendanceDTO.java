package com.labourlink.labourlinkai.dto;

import com.labourlink.labourlinkai.entity.DailyAttendance;
import java.time.Instant;
import java.time.LocalDate;

public record AttendanceDTO(LocalDate workDate, DailyAttendance.Status status, Long markedByContractorId,
                            Instant markedAt) {
}
