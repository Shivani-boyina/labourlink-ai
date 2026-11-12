package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.dto.ApplicationResponseDTO;
import com.labourlink.labourlinkai.entity.Application;
import com.labourlink.labourlinkai.service.ApplicationService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/applications")
public class ApplicationController {

    @Autowired
    private ApplicationService applicationService;

    // Worker applies for a job (identity derived from Principal)
    @PostMapping
    public Application applyForJob(
            @RequestBody(required = false) Application application,
            @RequestParam(required = false) Long jobId,
            Principal principal) {

        Long targetJobId = (jobId != null) ? jobId : (application != null ? application.getJobId() : null);
        if (targetJobId == null) {
            throw new RuntimeException("Job ID is required");
        }
        return applicationService.applyForJob(targetJobId, principal.getName());
    }

    // Worker views their own applications
    @GetMapping("/my")
    public List<ApplicationResponseDTO> getMyApplications(Principal principal) {
        if (principal == null) {
            throw new RuntimeException("Authentication required");
        }
        return applicationService.getMyApplications(principal.getName());
    }

    // Contractor views applicants for a job they own
    @GetMapping("/job/{jobId}")
    public List<ApplicationResponseDTO> getApplicationsForJob(
            @PathVariable Long jobId,
            Principal principal) {

        if (principal == null) {
            throw new RuntimeException("Authentication required");
        }
        return applicationService.getApplicationsForJob(jobId, principal.getName());
    }

    // Contractor updates status (verifies ownership)
    @PutMapping("/{id}/status")
    public Application updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            Principal principal) {

        return applicationService.updateStatus(id, status, principal.getName());
    }
}
