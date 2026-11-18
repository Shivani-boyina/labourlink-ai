package com.labourlink.labourlinkai.dto;

import com.labourlink.labourlinkai.entity.WorkerAllocation;
import java.time.Instant;
import java.time.LocalDate;

public record AllocationDTO(Long allocationId, Long applicationId, Long jobId, String jobTitle,
                            Long workerId, String workerName, WorkerAllocation.Status status,
                            Instant allocatedAt, LocalDate startDate, LocalDate endDate) {
}
