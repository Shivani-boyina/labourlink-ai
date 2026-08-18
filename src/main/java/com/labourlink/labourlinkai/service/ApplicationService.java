package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Application;

import java.util.List;

public interface ApplicationService {

    Application applyForJob(Application application);

    List<Application> getAllApplications();

    Application updateStatus(Long applicationId, String status);

    Application getApplicationById(Long applicationId);
}