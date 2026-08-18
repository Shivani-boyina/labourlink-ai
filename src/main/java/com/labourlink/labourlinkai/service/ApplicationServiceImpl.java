package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Application;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.JobRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ApplicationServiceImpl implements ApplicationService {

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private JobRepository jobRepository;

    @Override
    public Application applyForJob(Application application) {
        return applicationRepository.save(application);
    }

    @Override
    public List<Application> getAllApplications() {
        return applicationRepository.findAll();
    }

    @Override
    public Application getApplicationById(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));
    }

    @Override
    public Application updateStatus(Long applicationId, String status) {

        Application application = getApplicationById(applicationId);

        if ("ACCEPTED".equalsIgnoreCase(status)) {

            Job job = jobRepository.findById(application.getJobId())
                    .orElseThrow(() -> new RuntimeException("Job not found"));

            long acceptedWorkers =
                    applicationRepository.countByJobIdAndStatus(
                            application.getJobId(),
                            "ACCEPTED"
                    );

            if (acceptedWorkers >= job.getRequiredWorkers()) {
                throw new RuntimeException("Job capacity full");
            }
        }

        application.setStatus(status);

        return applicationRepository.save(application);
    }
}