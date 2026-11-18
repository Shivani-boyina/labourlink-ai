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
import org.springframework.transaction.annotation.Isolation;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
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

    @Autowired
    private AllocationService allocationService;

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
                applicationRepository.countOccupyingSlots(job.getJobId()) >= job.getRequiredWorkers()) {
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
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ApplicationResponseDTO applyForJob(Long jobId, String workerPhone) {

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

        return toResponse(saveApplication(app));
    }

    @Override
    public List<ApplicationResponseDTO> getMyApplications(String workerPhone) {

        Worker worker = workerRepository.findByPhone(workerPhone)
                .orElseThrow(() -> new RuntimeException("Worker not found"));

        List<Application> apps = applicationRepository.findByWorkerId(worker.getWorkerId());
        List<ApplicationResponseDTO> result = new ArrayList<>();

        for (Application app : apps) {
            result.add(toResponse(app));
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
            result.add(toResponse(app));
        }

        return result;
    }

    @Override
    public Application getApplicationById(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));
    }

    private ApplicationResponseDTO toResponse(Application application) {
        Job job = jobRepository.findById(application.getJobId()).orElse(null);
        Worker worker = workerRepository.findById(application.getWorkerId()).orElse(null);
        ApplicationResponseDTO response = new ApplicationResponseDTO(
                application.getApplicationId(),
                application.getJobId(),
                job != null ? job.getTitle() : "Unknown Job",
                job != null ? job.getLocation() : "Unknown Location",
                job != null ? job.getWagePerDay() : null,
                application.getWorkerId(),
                worker != null ? worker.getName() : "Unknown Worker",
                worker != null ? worker.getPhone() : "",
                worker != null ? worker.getSkill() : "",
                worker != null ? worker.getExperience() : null,
                worker != null ? worker.getLocation() : null,
                worker != null ? worker.getAvailability() : null,
                worker != null ? worker.getExpectedWagePerDay() : null,
                application.getApplicationDate(),
                application.getStatus());
        response.setAcceptedAt(application.getAcceptedAt());
        if ("ACCEPTED".equalsIgnoreCase(application.getStatus())) {
            response.setAllocationStatus(allocationService.statusForApplication(application.getApplicationId()));
        }
        return response;
    }

    private Application updateStatusLocked(Application application, Job job, String newStatus) {
        if (newStatus.equalsIgnoreCase(application.getStatus())) {
            return application;
        }
        if (!"PENDING".equalsIgnoreCase(application.getStatus())) {
            throw new RuntimeException("Only pending applications can be changed");
        }

        if ("ACCEPTED".equalsIgnoreCase(newStatus)) {
            if (!"OPEN".equalsIgnoreCase(job.getStatus())) {
                throw new RuntimeException("This job is closed");
            }
            Worker worker = workerRepository.findForUpdate(application.getWorkerId())
                    .orElseThrow(() -> new IllegalStateException("Worker not found"));
            if (!Boolean.TRUE.equals(worker.getAvailability())) {
                throw new IllegalStateException("Worker is no longer eligible for allocation: worker is unavailable");
            }
            if (job.getRequiredWorkers() == null || job.getRequiredWorkers() <= 0) {
                throw new RuntimeException("Job worker capacity is not configured correctly");
            }

            long acceptedWorkers = applicationRepository.countOccupyingSlots(job.getJobId());

            if (acceptedWorkers >= job.getRequiredWorkers()) {
                throw new RuntimeException("Job capacity full");
            }
            application.setAcceptedAt(Instant.now().truncatedTo(ChronoUnit.MICROS));
        }

        application.setStatus(newStatus);
        Application saved = applicationRepository.save(application);
        if ("ACCEPTED".equals(newStatus)) {
            allocationService.createForNewAcceptance(saved, job);
        }
        return saved;
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ApplicationResponseDTO updateStatus(Long applicationId, String status, String contractorPhone) {
        String newStatus = status == null ? "" : status.toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(newStatus)) {
            throw new RuntimeException("Invalid status. Use PENDING, ACCEPTED, or REJECTED");
        }

        Contractor contractor = contractorRepository.findByPhone(contractorPhone)
                .orElseThrow(() -> new RuntimeException("Contractor not found"));

        Long jobId = applicationRepository.findJobIdByApplicationId(applicationId)
                .orElseThrow(() -> new RuntimeException("Application not found"));
        Job job = jobRepository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found"));

        if (!java.util.Objects.equals(job.getContractorId(), contractor.getContractorId())) {
            throw new RuntimeException("Access denied: You do not own this job");
        }

        Application application = applicationRepository.findByIdForUpdate(applicationId)
                .filter(record -> jobId.equals(record.getJobId()))
                .orElseThrow(() -> new RuntimeException("Application not found"));
        return toResponse(updateStatusLocked(application, job, newStatus));
    }
}
