package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.dto.JobMatchDTO;
import com.labourlink.labourlinkai.dto.JobSearchDTO;
import com.labourlink.labourlinkai.dto.JobRecommendationsDTO;
import com.labourlink.labourlinkai.dto.JobRecommendationsDTO.Reason;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.integration.MLFeatureMapper;
import com.labourlink.labourlinkai.integration.MLMatchScoring;
import com.labourlink.labourlinkai.integration.MatchingText;
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
import java.util.EnumSet;
import java.util.function.Predicate;

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
        if (job.getEndDate() != null && job.getEndDate().isBefore(LocalDate.ofInstant(now, ZoneId.of("Asia/Kolkata")))) return List.of();
        var pool = workers.findMatchingSkill(job.getRequiredSkill().strip()).stream()
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
                match.setMatchingScore(recommendationScore(job, worker));
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

    JobRecommendationsDTO recommend(Worker worker, List<Job> candidates, Predicate<Job> hasCapacity) {
        if (candidates.isEmpty()) return new JobRecommendationsDTO(List.of(), List.of(Reason.NO_OPEN_JOBS));

        Instant now = Instant.now();
        LocalDate today = LocalDate.ofInstant(now, ZoneId.of("Asia/Kolkata"));
        var ids = List.of(worker.getWorkerId());
        var exclusions = EnumSet.noneOf(Reason.class);
        List<Job> eligible = new ArrayList<>();
        for (Job job : candidates) {
            // Record the first failed criterion per job. Capacity and schedule reads only
            // run for jobs that already meet the profile requirements.
            Reason reason = profileExclusion(job, worker);
            if (reason == null && job.getEndDate() != null && job.getEndDate().isBefore(today)) reason = Reason.EXPIRED;
            if (reason == null && !hasCapacity.test(job)) reason = Reason.NO_OPEN_SLOTS;
            if (reason == null && !history.unavailableFor(ids, job, now).isEmpty()) reason = Reason.SCHEDULE;
            if (reason == null) eligible.add(job);
            else exclusions.add(reason);
        }
        if (eligible.isEmpty()) return new JobRecommendationsDTO(List.of(), List.copyOf(exclusions));
        var rating = reviews.ratings(ids).getOrDefault(worker.getWorkerId(), ReviewReadRepository.Rating.UNRATED);
        var month = history.monthlyAllocations(ids, MatchingDataRepository.Month.containing(now)).countFor(worker.getWorkerId());
        var batch = scoring.batch();
        var recommendations = eligible.stream()
                .map(job -> new JobSearchDTO(job, recommendationScore(job, worker),
                        batch.score(MLFeatureMapper.from(worker, job, rating, month)), reasons(job, worker)))
                .sorted(Comparator.comparingDouble(WorkerMatchingService::displayScore).reversed()
                        .thenComparing(row -> row.getJob().getJobId()))
                .toList();
        return new JobRecommendationsDTO(recommendations, List.of());
    }

    private static int recommendationScore(Job job, Worker worker) {
        int score = 0;
        if (sameSkill(job.getRequiredSkill(), worker.getSkill())) score += 40;
        if (same(job.getLocation(), worker.getLocation())) score += 25;

        Integer minimumExperience = job.getMinimumExperience();
        if (minimumExperience == null || minimumExperience == 0) score += 15;
        else if (worker.getExperience() != null && worker.getExperience() >= minimumExperience) score += 15;
        else if (worker.getExperience() != null) score += Math.max(0, 15 * worker.getExperience() / minimumExperience);

        Double expected = worker.getExpectedWagePerDay();
        Double offered = job.getWagePerDay();
        if (expected != null && expected > 0 && offered != null) {
            score += (int) Math.round(20 * Math.min(1.0, offered / expected));
        }
        return score;
    }

    private static double displayScore(JobSearchDTO row) {
        Double model = row.getRecommendation().matchPercentage();
        return model == null ? row.getMatchingScore() : model;
    }

    public static boolean eligibleProfile(Job job, Worker worker) {
        return profileExclusion(job, worker) == null;
    }

    private static Reason profileExclusion(Job job, Worker worker) {
        if (!Boolean.TRUE.equals(worker.getAvailability())) return Reason.UNAVAILABLE;
        if (!sameSkill(job.getRequiredSkill(), worker.getSkill())) return Reason.SKILL;
        if (!same(job.getLocation(), worker.getLocation())) return Reason.LOCATION;
        if (!compatibleRegion(job.getState(), worker.getState())
                || !compatibleRegion(job.getDistrict(), worker.getDistrict())) return Reason.REGION;
        Integer minimum = job.getMinimumExperience();
        if (minimum != null && minimum > 0 && (worker.getExperience() == null || worker.getExperience() < minimum)) {
            return Reason.EXPERIENCE;
        }
        Double expected = worker.getExpectedWagePerDay();
        if (expected != null && (!Double.isFinite(expected) || expected < 0
                || job.getWagePerDay() == null || expected > job.getWagePerDay())) return Reason.WAGE;
        return null;
    }

    private static List<String> reasons(Job job, Worker worker) {
        return List.of("SKILL", "LOCATION", "AVAILABLE",
                job.getMinimumExperience() != null && job.getMinimumExperience() > 0 ? "EXPERIENCE" : "NO_EXPERIENCE_MINIMUM",
                worker.getExpectedWagePerDay() == null ? "WAGE_UNKNOWN" : "WAGE",
                job.getStartDate() == null ? "SCHEDULE_UNKNOWN" : "SCHEDULE");
    }

    private static boolean compatibleRegion(String job, String worker) {
        return MatchingText.normalize(job).isEmpty() || MatchingText.normalize(worker).isEmpty() || same(job, worker);
    }

    private static boolean same(String left, String right) {
        String normalized = MatchingText.normalize(left);
        return !normalized.isEmpty() && normalized.equalsIgnoreCase(MatchingText.normalize(right));
    }

    private static boolean sameSkill(String left, String right) {
        return left != null && !left.isBlank() && right != null && left.strip().equalsIgnoreCase(right.strip());
    }
}
