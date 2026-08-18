package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.dto.JobMatchDTO;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;

@Service
public class JobServiceImpl implements JobService {

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Override
    public Job createJob(Job job) {
        return jobRepository.save(job);
    }

    @Override
    public List<Job> getAllJobs() {
        return jobRepository.findAll();
    }

    @Override
    public Job getJobById(Long id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Job not found"));
    }

    @Override
    public void deleteJob(Long id) {
        jobRepository.deleteById(id);
    }

    @Override
    public List<JobMatchDTO> searchJobs(
            String skill,
            String location,
            Double minWage,
            Double maxWage) {

        // Step 1: Fetch only OPEN jobs
        List<Job> jobs = jobRepository.findByStatus("OPEN");

        // Step 2: Filter by skill
        if (skill != null && !skill.isBlank()) {
            jobs = jobs.stream()
                    .filter(job ->
                            job.getRequiredSkill() != null &&
                            job.getRequiredSkill()
                                    .equalsIgnoreCase(skill))
                    .toList();
        }

        // Step 3: Filter by location
        if (location != null && !location.isBlank()) {
            jobs = jobs.stream()
                    .filter(job ->
                            job.getLocation() != null &&
                            job.getLocation()
                                    .equalsIgnoreCase(location))
                    .toList();
        }

        // Step 4: Filter by minimum wage
        if (minWage != null) {
            jobs = jobs.stream()
                    .filter(job ->
                            job.getWagePerDay() >= minWage)
                    .toList();
        }

        // Step 5: Filter by maximum wage
        if (maxWage != null) {
            jobs = jobs.stream()
                    .filter(job ->
                            job.getWagePerDay() <= maxWage)
                    .toList();
        }

        // Step 6: Remove jobs that are already full
        jobs = jobs.stream()
                .filter(this::isJobNotFull)
                .toList();

        // Step 7: Convert jobs into JobMatchDTO
        List<JobMatchDTO> matches = jobs.stream()
                .map(job -> {

                    int score = calculateMatchingScore(
                            job,
                            skill,
                            location,
                            minWage,
                            maxWage
                    );

                    return new JobMatchDTO(job, score);
                })
                .sorted(
                        Comparator.comparing(
                                JobMatchDTO::getMatchingScore
                        ).reversed()
                )
                .toList();

        return matches;
    }

    /**
     * Checks whether a job still has available worker capacity.
     */
    private boolean isJobNotFull(Job job) {

        long acceptedCount =
                applicationRepository.countByJobIdAndStatus(
                        job.getJobId(),
                        "ACCEPTED"
                );

        return acceptedCount < job.getRequiredWorkers();
    }

    /**
     * Calculates a basic matching score.
     *
     * Current scoring:
     * Skill    = 50 points
     * Location = 30 points
     * Wage     = 20 points
     *
     * Maximum = 100
     */
    private int calculateMatchingScore(
            Job job,
            String skill,
            String location,
            Double minWage,
            Double maxWage) {

        int score = 0;

        // Skill match
        if (skill != null &&
                !skill.isBlank() &&
                job.getRequiredSkill() != null &&
                job.getRequiredSkill()
                        .equalsIgnoreCase(skill)) {

            score += 50;
        }

        // Location match
        if (location != null &&
                !location.isBlank() &&
                job.getLocation() != null &&
                job.getLocation()
                        .equalsIgnoreCase(location)) {

            score += 30;
        }

        // Wage match
        if (minWage != null &&
                maxWage != null &&
                job.getWagePerDay() >= minWage &&
                job.getWagePerDay() <= maxWage) {

            score += 20;
        }

        return score;
    }
}