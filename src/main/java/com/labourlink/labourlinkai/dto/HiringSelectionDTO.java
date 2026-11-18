package com.labourlink.labourlinkai.dto;

import java.time.Instant;

public record HiringSelectionDTO(Long applicationId, Long jobId, String jobTitle,
                                 Long workerId, String workerName, String workerSkill,
                                 String applicationDate, Instant acceptedAt) {
}
