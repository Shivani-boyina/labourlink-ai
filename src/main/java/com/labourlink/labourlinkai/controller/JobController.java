package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.dto.JobMatchDTO;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.service.JobService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/jobs")
public class JobController {

    @Autowired
    private JobService jobService;

    @PostMapping
    public Job createJob(@Valid @RequestBody Job job) {
        return jobService.createJob(job);
    }

    @GetMapping
    public List<Job> getAllJobs() {
        return jobService.getAllJobs();
    }

    @GetMapping("/{id}")
    public Job getJobById(@PathVariable Long id) {
        return jobService.getJobById(id);
    }

    @DeleteMapping("/{id}")
    public String deleteJob(@PathVariable Long id) {
        jobService.deleteJob(id);
        return "Job deleted successfully";
    }

    @GetMapping("/search")
    public List<JobMatchDTO> searchJobs(
            @RequestParam(required = false)
            String skill,

            @RequestParam(required = false)
            String location,

            @RequestParam(required = false)
            Double minWage,

            @RequestParam(required = false)
            Double maxWage) {

        return jobService.searchJobs(
                skill,
                location,
                minWage,
                maxWage
        );
    }
}