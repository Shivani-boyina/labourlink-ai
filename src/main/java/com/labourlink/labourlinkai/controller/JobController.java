
package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.dto.JobMatchDTO;
import com.labourlink.labourlinkai.dto.JobSearchDTO;
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

    // CREATE JOB
    @PostMapping
    public Job createJob(@Valid @RequestBody Job job) {
        return jobService.createJob(job);
    }

    // GET ALL JOBS
    @GetMapping
    public List<Job> getAllJobs() {
        return jobService.getAllJobs();
    }

    // GET JOB BY ID
    @GetMapping("/{id}")
    public Job getJobById(@PathVariable Long id) {
        return jobService.getJobById(id);
    }

    // DELETE JOB
    @DeleteMapping("/{id}")
    public String deleteJob(@PathVariable Long id) {
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

    // FIND MATCHING WORKERS FOR A JOB
    @GetMapping("/{id}/matches")
    public List<JobMatchDTO> findMatchingWorkers(
            @PathVariable Long id) {

        return jobService.findMatchingWorkers(id);
    }
}
