package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.dto.ApplicationResponseDTO;
import com.labourlink.labourlinkai.entity.Application;

import java.util.List;

public interface ApplicationService {

    ApplicationResponseDTO applyForJob(Long jobId, String workerPhone);

    List<ApplicationResponseDTO> getMyApplications(String workerPhone);

    List<ApplicationResponseDTO> getApplicationsForJob(Long jobId, String contractorPhone);

    ApplicationResponseDTO updateStatus(Long applicationId, String status, String contractorPhone);

    Application getApplicationById(Long applicationId);
}
