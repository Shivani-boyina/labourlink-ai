package com.labourlink.labourlinkai.dto;

import com.labourlink.labourlinkai.entity.DailyAttendance;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record AttendanceCorrectionInput(@NotNull DailyAttendance.Status status,
                                        @NotNull Instant expectedMarkedAt,
                                        @NotBlank @Size(min = 12, max = 500) String reason) {
}
