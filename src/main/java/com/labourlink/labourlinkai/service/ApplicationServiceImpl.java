package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.dto.ApplicationResponseDTO;
import com.labourlink.labourlinkai.entity.Application;
import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Service
public class ApplicationServiceImpl implements ApplicationService {

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private WorkerRepository workerRepository;

    @Autowired
    private ContractorRepository contractorRepository;

    private static final Set<String> ALLOWED_STATUSES =
            Set.of("PENDING", "ACCEPTED", "REJECTED");

    private Application saveApplication(Application application) {

        if (application.getJobId() == null) {
            throw new RuntimeException("Job ID is required");
        }

        if (application.getWorkerId() == null) {
            throw new RuntimeException("Worker ID is required");
        }

        Job job = jobRepository.findById(application.getJobId())
                .orElseThrow(() -> new RuntimeException("Job not found"));

        if (!"OPEN".equalsIgnoreCase(job.getStatus())) {
            throw new RuntimeException("This job is closed");
        }

        if (job.getRequiredWorkers() == null || job.getRequiredWorkers() <= 0 ||
                applicationRepository.countByJobIdAndStatus(job.getJobId(), "ACCEPTED") >= job.getRequiredWorkers()) {
            throw new RuntimeException("This job has reached its worker capacity");
        }

        boolean alreadyApplied =
                applicationRepository.existsByJobIdAndWorkerId(
                        application.getJobId(),
                        application.getWorkerId()
                );

        if (alreadyApplied) {
            throw new RuntimeException("Worker already applied for this job");
        }

        if (application.getApplicationDate() == null || application.getApplicationDate().isBlank()) {
            application.setApplicationDate(LocalDate.now().toString());
        }

        if (application.getStatus() == null || application.getStatus().isBlank()) {
            application.setStatus("PENDING");
        }

        return applicationRepository.save(application);
    }

    @Override
    @Transactional
    public Application applyForJob(Long jobId, String workerPhone) {

        Job job = jobRepository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));
        if (!"OPEN".equalsIgnoreCase(job.getStatus())) {
            throw new RuntimeException("This job is closed");
        }

        Worker worker = workerRepository.findByPhone(workerPhone)
                .orElseThrow(() -> new RuntimeException("Worker not found"));

        Application app = new Application();
        app.setJobId(jobId);
        app.setWorkerId(worker.getWorkerId());
        app.setApplicationDate(LocalDate.now().toString());
        app.setStatus("PENDING");

        return saveApplication(app);
    }

    @Override
    public List<ApplicationResponseDTO> getMyApplications(String workerPhone) {

        Worker worker = workerRepository.findByPhone(workerPhone)
                .orElseThrow(() -> new RuntimeException("Worker not found"));

        List<Application> apps = applicationRepository.findByWorkerId(worker.getWorkerId());
        List<ApplicationResponseDTO> result = new ArrayList<>();

        for (Application app : apps) {
            Job job = jobRepository.findById(app.getJobId()).orElse(null);

            result.add(new ApplicationResponseDTO(
                    app.getApplicationId(),
                    app.getJobId(),
                    job != null ? job.getTitle() : "Unknown Job",
                    job != null ? job.getLocation() : "Unknown Location",
                    job != null ? job.getWagePerDay() : null,
                    worker.getWorkerId(),
                    worker.getName(),
                    worker.getPhone(),
                    worker.getSkill(),
                    worker.getExperience(),
                    app.getApplicationDate(),
                    app.getStatus()
            ));
        }

        return result;
    }

    @Override
    public List<ApplicationResponseDTO> getApplicationsForJob(Long jobId, String contractorPhone) {

        Contractor contractor = contractorRepository.findByPhone(contractorPhone)
                .orElseThrow(() -> new RuntimeException("Contractor not found"));

        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        if (!java.util.Objects.equals(job.getContractorId(), contractor.getContractorId())) {
            throw new RuntimeException("Access denied: You do not own this job");
        }

        List<Application> apps = applicationRepository.findByJobId(jobId);
        List<ApplicationResponseDTO> result = new ArrayList<>();

        for (Application app : apps) {
            Worker worker = workerRepository.findById(app.getWorkerId()).orElse(null);

            result.add(new ApplicationResponseDTO(
                    app.getApplicationId(),
                    job.getJobId(),
                    job.getTitle(),
                    job.getLocation(),
                    job.getWagePerDay(),
                    app.getWorkerId(),
                    worker != null ? worker.getName() : "Unknown Worker",
                    worker != null ? worker.getPhone() : "",
                    worker != null ? worker.getSkill() : "",
                    worker != null ? worker.getExperience() : null,
                    app.getApplicationDate(),
                    app.getStatus()
            ));
        }

        return result;
    }

    @Override
    public Application getApplicationById(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));
    }

    private Application updateStatusLocked(Long applicationId, String status) {

        if (status == null || !ALLOWED_STATUSES.contains(status.toUpperCase())) {
            throw new RuntimeException("Invalid status. Use PENDING, ACCEPTED, or REJECTED");
        }

        Application application = getApplicationById(applicationId);
        String newStatus = status.toUpperCase();

        if (newStatus.equalsIgnoreCase(application.getStatus())) {
            return application;
        }
        if (!"PENDING".equalsIgnoreCase(application.getStatus())) {
            throw new RuntimeException("Only pending applications can be changed");
        }

        Job job = jobRepository.findByIdForUpdate(application.getJobId())
                .orElseThrow(() -> new RuntimeException("Job not found"));

        if ("ACCEPTED".equalsIgnoreCase(newStatus)) {
            if (job.getRequiredWorkers() == null || job.getRequiredWorkers() <= 0) {
                throw new RuntimeException("Job worker capacity is not configured correctly");
            }

            long acceptedWorkers =
                    applicationRepository.countByJobIdAndStatus(
                            application.getJobId(),
                            "ACCEPTED"
                    );

            if (acceptedWorkers >= job.getRequiredWorkers()) {
                throw new RuntimeException("Job capacity full");
            }
        }

        application.setStatus(newStatus);
        return applicationRepository.save(application);
    }

    @Override
    @Transactional
    public Application updateStatus(Long applicationId, String status, String contractorPhone) {

        Contractor contractor = contractorRepository.findByPhone(contractorPhone)
                .orElseThrow(() -> new RuntimeException("Contractor not found"));

        Application application = getApplicationById(applicationId);

        Job job = jobRepository.findById(application.getJobId())
                .orElseThrow(() -> new RuntimeException("Job not found"));

        if (!java.util.Objects.equals(job.getContractorId(), contractor.getContractorId())) {
            throw new RuntimeException("Access denied: You do not own this job");
        }

        return updateStatusLocked(applicationId, status);
    }
}
