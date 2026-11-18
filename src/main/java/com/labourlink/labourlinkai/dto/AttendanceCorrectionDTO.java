package com.labourlink.labourlinkai.dto;

import java.time.Instant;
import java.time.LocalDate;

public record AttendanceCorrectionDTO(Long id, LocalDate workDate, String previousStatus, String newStatus,
                                      String reason, Long contractorId, Instant correctedAt) {
}
