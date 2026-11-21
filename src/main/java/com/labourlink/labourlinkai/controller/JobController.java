package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.dto.JobMatchDTO;
import com.labourlink.labourlinkai.dto.JobSearchDTO;
import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.service.JobService;

import com.labourlink.labourlinkai.response.ApiResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.security.Principal;
import java.sql.SQLException;
import java.util.function.Supplier;
import java.util.List;

@RestController
@RequestMapping("/jobs")
public class JobController {

    private static final Logger LOG = LoggerFactory.getLogger(JobController.class);

    @Autowired
    private JobService jobService;

    @Autowired
    private ContractorRepository contractorRepository;

    @Autowired
    private JobRepository jobRepository;

    // CREATE JOB - Enforces that the contractorId comes from the authenticated contractor
    @PostMapping
    public Job createJob(@Valid @RequestBody Job job, Principal principal) {
        Contractor contractor = contractorRepository.findByPhone(principal.getName())
                .orElseThrow(() -> new RuntimeException("Contractor not found"));
        job.setJobId(null);
        job.setContractorId(contractor.getContractorId());
        job.setStatus("OPEN");
        return jobService.createJob(job);
    }

    // GET ALL JOBS
    @GetMapping
    public List<Job> getAllJobs(Principal principal, Authentication authentication) {
        if (authentication == null) {
            return jobRepository.findByStatus("OPEN");
        }
        boolean contractorRole = authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_CONTRACTOR".equals(authority.getAuthority()));
        if (contractorRole) {
            Contractor contractor = contractorRepository.findByPhone(principal.getName())
                    .orElseThrow(() -> new RuntimeException("Contractor not found"));
            return jobRepository.findByContractorId(contractor.getContractorId());
        }
        return jobRepository.findByStatus("OPEN");
    }

    // GET JOB BY ID
    @GetMapping("/{id}")
    public Job getJobById(@PathVariable Long id, Principal principal, Authentication authentication) {
        Job job = jobService.getJobById(id);
        if ("OPEN".equalsIgnoreCase(job.getStatus())) {
            return job;
        }

        if (authentication != null && principal != null && authentication.getAuthorities().stream()
                .anyMatch(authority -> "ROLE_CONTRACTOR".equals(authority.getAuthority()))) {
            Contractor contractor = contractorRepository.findByPhone(principal.getName())
                    .orElseThrow(() -> new RuntimeException("Contractor not found"));
            if (java.util.Objects.equals(job.getContractorId(), contractor.getContractorId())) {
                return job;
            }
        }
        throw new RuntimeException("Job not found");
    }

    // UPDATE JOB - Only editable fields are copied; ownership and status stay server-controlled.
    @PutMapping("/{id}")
    public Job updateJob(@PathVariable Long id, @Valid @RequestBody Job changes, Principal principal) {
        Contractor contractor = contractorRepository.findByPhone(principal.getName())
                .orElseThrow(() -> new RuntimeException("Contractor not found"));
        Job existing = jobService.getJobById(id);
        if (!java.util.Objects.equals(existing.getContractorId(), contractor.getContractorId())) {
            throw new RuntimeException("Access denied: You do not own this job");
        }
        return jobService.updateJob(id, changes);
    }

    // CLOSE JOB - This is a one-way status action; reopening is not exposed.
    @PatchMapping("/{id}/close")
    public Job closeJob(@PathVariable Long id, Principal principal) {
        Contractor contractor = contractorRepository.findByPhone(principal.getName())
                .orElseThrow(() -> new RuntimeException("Contractor not found"));
        Job existing = jobService.getJobById(id);
        if (!java.util.Objects.equals(existing.getContractorId(), contractor.getContractorId())) {
            throw new RuntimeException("Access denied: You do not own this job");
        }
        return jobService.closeJob(id);
    }

    // DELETE JOB - Enforces that contractors can only delete their own jobs
    @DeleteMapping("/{id}")
    public String deleteJob(@PathVariable Long id, Principal principal) {
        Contractor contractor = contractorRepository.findByPhone(principal.getName())
                .orElseThrow(() -> new RuntimeException("Contractor not found"));
        Job job = jobService.getJobById(id);
        if (!java.util.Objects.equals(job.getContractorId(), contractor.getContractorId())) {
            throw new RuntimeException("Access denied: You do not own this job");
        }
        jobService.deleteJob(id);
        return "Job deleted successfully";
    }

    // SEARCH JOBS
    @GetMapping("/search")
    public List<JobSearchDTO> searchJobs(
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Double minWage,
            @RequestParam(required = false) Double maxWage) {

        return jobService.searchJobs(
                skill,
                location,
                minWage,
                maxWage
        );
    }

    @GetMapping("/recommendations/me")
    public ResponseEntity<?> getRecommendations(Principal principal) {
        return recommendationResponse(() -> jobService.findRecommendedJobs(principal.getName()));
    }

    @GetMapping(value = "/recommendations/me", params = "details=true")
    public ResponseEntity<?> getRecommendationDetails(Principal principal) {
        return recommendationResponse(() -> jobService.findRecommendationDetails(principal.getName()));
    }

    private ResponseEntity<?> recommendationResponse(Supplier<?> load) {
        try {
            return ResponseEntity.ok(load.get());
        } catch (ResponseStatusException failure) {
            return ResponseEntity.status(failure.getStatusCode())
                    .body(new ApiResponse<>(failure.getReason(), "error", null));
        } catch (RuntimeException failure) {
            String sqlState = null;
            Throwable cause = failure;
            while (cause != null && sqlState == null) {
                if (cause instanceof SQLException sql) sqlState = sql.getSQLState();
                cause = cause.getCause();
            }
            var status = failure instanceof DataAccessResourceFailureException
                    ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.INTERNAL_SERVER_ERROR;
            LOG.error("Worker recommendations failed: status={} exception={} sqlState={}",
                    status.value(), failure.getClass().getSimpleName(), sqlState);
            return ResponseEntity.status(status)
                    .body(new ApiResponse<>("Recommendations could not be loaded", "error", null));
        }
    }

    // FIND MATCHING WORKERS FOR A JOB
    @GetMapping("/{id}/matches")
    public List<JobMatchDTO> findMatchingWorkers(
            @PathVariable Long id,
            @RequestParam(defaultValue = "true") boolean includePrediction,
            Principal principal) {

        Contractor contractor = contractorRepository.findByPhone(principal.getName())
                .orElseThrow(() -> new RuntimeException("Contractor not found"));
        Job job = jobService.getJobById(id);
        if (!java.util.Objects.equals(job.getContractorId(), contractor.getContractorId())) {
            throw new RuntimeException("Access denied: You do not own this job");
        }

        return jobService.findMatchingWorkers(id, includePrediction);
    }
}
