package com.labourlink.labourlinkai.dto;

public record ArchivedApplicationDTO(Long applicationId, Long jobId, String jobTitle,
                                     String status, String applicationDate) {
}
