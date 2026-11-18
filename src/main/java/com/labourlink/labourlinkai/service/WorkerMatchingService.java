package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.dto.JobMatchDTO;
import com.labourlink.labourlinkai.dto.JobSearchDTO;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.integration.MLFeatureMapper;
import com.labourlink.labourlinkai.integration.MLMatchScoring;
import com.labourlink.labourlinkai.repository.MatchingDataRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.review.ReviewReadRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.function.ToIntFunction;

@Service
public class WorkerMatchingService {
    private static final Comparator<Worker> BY_EXPERIENCE = Comparator.comparing(Worker::getExperience,
            Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(Worker::getWorkerId);

    private final WorkerRepository workers;
    private final MatchingDataRepository history;
    private final ReviewReadRepository reviews;
    private final MLMatchScoring scoring;

    public WorkerMatchingService(WorkerRepository workers, MatchingDataRepository history,
                                 ReviewReadRepository reviews, MLMatchScoring scoring) {
        this.workers = workers;
        this.history = history;
        this.reviews = reviews;
        this.scoring = scoring;
    }

    List<JobMatchDTO> find(Job job, boolean includePrediction) {
        if (job.getRequiredSkill() == null || job.getLocation() == null) return List.of();
        Instant now = Instant.now();
        var pool = workers.findBySkillIgnoreCase(job.getRequiredSkill()).stream()
                .filter(worker -> eligibleProfile(job, worker))
                .sorted(BY_EXPERIENCE).toList();
        var unavailable = history.unavailableFor(pool.stream().map(Worker::getWorkerId).toList(), job, now);
        var eligible = pool.stream().filter(worker -> !unavailable.contains(worker.getWorkerId())).toList();
        var ids = eligible.stream().map(Worker::getWorkerId).toList();
        if (ids.isEmpty()) return List.of();
        var ratings = reviews.ratings(ids);
        var monthly = includePrediction ? history.monthlyAllocations(ids, MatchingDataRepository.Month.containing(now)) : null;
        var batch = scoring.batch();
        List<JobMatchDTO> matches = new ArrayList<>();
        for (Worker worker : eligible) {
            var rating = ratings.getOrDefault(worker.getWorkerId(), ReviewReadRepository.Rating.UNRATED);
            var match = new JobMatchDTO(worker.getWorkerId(), worker.getName(), worker.getPhone(), worker.getSkill(),
                    worker.getExperience(), worker.getLocation(), worker.getAvailability(),
                    "Skill and location match; recorded availability and job requirements checked");
            match.applyRating(rating.averageRating(), rating.reviewCount());
            if (includePrediction) {
                var input = MLFeatureMapper.from(worker, job, rating, monthly.countFor(worker.getWorkerId()));
                match.applyRecommendation(batch.score(input), reasons(job, worker));
            }
            matches.add(match);
        }
        if (includePrediction) {
            // The stable sort preserves experience order for fallback and equal scores.
            matches.sort(Comparator.comparing(match -> match.getRecommendation().matchPercentage(),
                    Comparator.nullsLast(Comparator.reverseOrder())));
        }
        return matches;
    }

    List<JobSearchDTO> recommend(Worker worker, List<Job> candidates, ToIntFunction<Job> ruleScore) {
        if (!Boolean.TRUE.equals(worker.getAvailability())) return List.of();
        Instant now = Instant.now();
        LocalDate today = LocalDate.ofInstant(now, ZoneId.of("Asia/Kolkata"));
        var ids = List.of(worker.getWorkerId());
        var eligible = candidates.stream()
                .filter(job -> job.getEndDate() == null || !job.getEndDate().isBefore(today))
                .filter(job -> eligibleProfile(job, worker))
                .filter(job -> history.unavailableFor(ids, job, now).isEmpty())
                .toList();
        if (eligible.isEmpty()) return List.of();
        var rating = reviews.ratings(ids).getOrDefault(worker.getWorkerId(), ReviewReadRepository.Rating.UNRATED);
        var month = history.monthlyAllocations(ids, MatchingDataRepository.Month.containing(now)).countFor(worker.getWorkerId());
        var batch = scoring.batch();
        return eligible.stream()
                .map(job -> new JobSearchDTO(job, ruleScore.applyAsInt(job),
                        batch.score(MLFeatureMapper.from(worker, job, rating, month))))
                .sorted(Comparator.comparingDouble(WorkerMatchingService::displayScore).reversed()
                        .thenComparing(row -> row.getJob().getJobId()))
                .toList();
    }

    private static double displayScore(JobSearchDTO row) {
        Double model = row.getRecommendation().matchPercentage();
        return model == null ? row.getMatchingScore() : model;
    }

    public static boolean eligibleProfile(Job job, Worker worker) {
        Integer minimum = job.getMinimumExperience();
        Double expected = worker.getExpectedWagePerDay();
        return Boolean.TRUE.equals(worker.getAvailability())
                && same(job.getRequiredSkill(), worker.getSkill())
                && same(job.getLocation(), worker.getLocation())
                && compatibleRegion(job.getState(), worker.getState())
                && compatibleRegion(job.getDistrict(), worker.getDistrict())
                && (minimum == null || minimum <= 0 || (worker.getExperience() != null && worker.getExperience() >= minimum))
                && (expected == null || (Double.isFinite(expected) && expected >= 0
                    && job.getWagePerDay() != null && expected <= job.getWagePerDay()));
    }

    private static List<String> reasons(Job job, Worker worker) {
        return List.of("SKILL", "LOCATION", "AVAILABLE",
                job.getMinimumExperience() != null && job.getMinimumExperience() > 0 ? "EXPERIENCE" : "NO_EXPERIENCE_MINIMUM",
                worker.getExpectedWagePerDay() == null ? "WAGE_UNKNOWN" : "WAGE",
                job.getStartDate() == null ? "SCHEDULE_UNKNOWN" : "SCHEDULE");
    }

    private static boolean compatibleRegion(String job, String worker) {
        return job == null || job.isBlank() || worker == null || worker.isBlank() || same(job, worker);
    }

    private static boolean same(String left, String right) {
        return left != null && !left.isBlank() && right != null && left.strip().equalsIgnoreCase(right.strip());
    }
}
