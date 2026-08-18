package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.entity.Application;
import com.labourlink.labourlinkai.service.ApplicationService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/applications")
public class ApplicationController {

    @Autowired
    private ApplicationService applicationService;

    // Worker applies for a job
    @PostMapping
    public Application applyForJob(@RequestBody Application application) {
        return applicationService.applyForJob(application);
    }

    // View all applications
    @GetMapping
    public List<Application> getAllApplications() {
        return applicationService.getAllApplications();
    }
    @PutMapping("/{id}/status")
public Application updateStatus(
        @PathVariable Long id,
        @RequestParam String status) {

    return applicationService.updateStatus(id, status);
}
}