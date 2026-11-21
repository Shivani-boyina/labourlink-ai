package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.dto.JobMatchDTO;
import com.labourlink.labourlinkai.dto.JobSearchDTO;
import com.labourlink.labourlinkai.dto.JobRecommendationsDTO;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.entity.Contractor;

@Service
public class JobServiceImpl implements JobService {

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private WorkerRepository workerRepository;

    @Autowired
    private ApplicationRepository applicationRepository;
    @Autowired
    private WorkerMatchingService workerMatching;
    @Autowired
    private ContractorRepository contractorRepository;

    @Override
    public Job createJob(Job job) {
        job.setCategory(ProfileText.optional(job.getCategory()));
        job.setState(ProfileText.optional(job.getState()));
        job.setDistrict(ProfileText.optional(job.getDistrict()));
        return jobRepository.save(job);
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Job updateJob(Long id, Job changes) {
        Job job = jobRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new RuntimeException("Job not found"));
        long acceptedWorkers = applicationRepository.countOccupyingSlots(id);
        if (changes.getRequiredWorkers() < acceptedWorkers) {
            throw new RuntimeException("Required workers cannot be lower than accepted workers");
        }

        job.setTitle(changes.getTitle());
        job.setDescription(changes.getDescription());
        job.setRequiredSkill(changes.getRequiredSkill());
        job.setLocation(changes.getLocation());
        if (changes.getCategory() != null) job.setCategory(ProfileText.optional(changes.getCategory()));
        if (changes.getState() != null) job.setState(ProfileText.optional(changes.getState()));
        if (changes.getDistrict() != null) job.setDistrict(ProfileText.optional(changes.getDistrict()));
        job.setMinimumExperience(changes.getMinimumExperience());
        job.setDurationDays(changes.getDurationDays());
        if (changes.hasScheduleUpdate()) {
            job.setStartDate(changes.getStartDate());
            job.setEndDate(changes.getEndDate());
        }
        job.setWagePerDay(changes.getWagePerDay());
        job.setRequiredWorkers(changes.getRequiredWorkers());
        return jobRepository.save(job);
    }

    @Override
    @Transactional
    public Job closeJob(Long id) {
        Job job = jobRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new RuntimeException("Job not found"));
        job.setStatus("CLOSED");
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
    @Transactional
    public void deleteJob(Long id) {
        Job job = jobRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new RuntimeException("Job not found"));
        if (applicationRepository.existsByJobId(id)) {
            throw new RuntimeException("Cannot delete a job that has applications");
        }
        jobRepository.delete(job);
    }

    @Override
    public List<JobSearchDTO> searchJobs(
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
                            job.getWagePerDay() != null &&
                            job.getWagePerDay() >= minWage)
                    .toList();
        }

        // Step 5: Filter by maximum wage
        if (maxWage != null) {
            jobs = jobs.stream()
                    .filter(job ->
                            job.getWagePerDay() != null &&
                            job.getWagePerDay() <= maxWage)
                    .toList();
        }

        // Step 6: Remove jobs that are already full
        jobs = jobs.stream()
                .filter(this::isJobNotFull)
                .toList();

        // Step 7: Calculate matching scores
        List<JobSearchDTO> matches = jobs.stream()
                .map(job -> {

                    int score = calculateMatchingScore(
                            job,
                            skill,
                            location,
                            minWage,
                            maxWage
                    );

                    return new JobSearchDTO(job, score);
                })
                .sorted(
                        Comparator.comparing(
                                JobSearchDTO::getMatchingScore
                        ).reversed()
                )
                .toList();

        return matches;
    }

    /**
     * Checks whether a job still has available worker capacity.
     */
    private boolean isJobNotFull(Job job) {

        long acceptedCount = applicationRepository.countOccupyingSlots(job.getJobId());

        return job.getRequiredWorkers() != null && acceptedCount < job.getRequiredWorkers();
    }

    /**
     * Calculates a basic job matching score.
     *
     * Skill    = 50 points
     * Location = 30 points
     * Wage     = 20 points
     *
     * Maximum = 100 points
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
                job.getWagePerDay() != null &&
                job.getWagePerDay() >= minWage &&
                job.getWagePerDay() <= maxWage) {

            score += 20;
        }

        return score;
    }

    @Override
    public List<JobMatchDTO> findMatchingWorkers(Long jobId, boolean includePrediction) {
        Job job = getJobById(jobId);
        if (!"OPEN".equalsIgnoreCase(job.getStatus()) || !isJobNotFull(job)) return List.of();
        return workerMatching.find(job, includePrediction);
    }

    @Override
    public List<JobSearchDTO> findRecommendedJobs(String workerPhone) {
        return findRecommendationDetails(workerPhone).recommendations();
    }

    @Override
    public JobRecommendationsDTO findRecommendationDetails(String workerPhone) {
        Worker worker = workerRepository.findByPhone(workerPhone)
                .orElseThrow(() -> new RuntimeException("Worker not found"));
        var appliedJobs = applicationRepository.findByWorkerId(worker.getWorkerId()).stream()
                .map(application -> application.getJobId()).collect(Collectors.toSet());
        var result = workerMatching.recommend(worker, jobRepository.findAll(), this::isJobNotFull, appliedJobs);
        var recommendations = result.recommendations();
        if (recommendations.isEmpty()) return result;
        var contractorIds = recommendations.stream().map(row -> row.getJob().getContractorId())
                .filter(Objects::nonNull).distinct().toList();
        var names = contractorRepository.findAllById(contractorIds).stream()
                .filter(contractor -> contractor.getContractorName() != null)
                .collect(Collectors.toMap(Contractor::getContractorId, Contractor::getContractorName));
        recommendations.forEach(row -> row.setContractorName(names.get(row.getJob().getContractorId())));
        return result;
    }

}
