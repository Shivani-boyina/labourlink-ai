package com.labourlink.labourlinkai.review;

import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.service.ContractorService;
import com.labourlink.labourlinkai.service.WorkerService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class WorkerReviewService {
    public record SavedReview(Long id, Integer rating, String feedback, Instant createdAt, Instant updatedAt) {}
    private final WorkerReviewRepository reviews;
    private final ReviewReadRepository query;
    private final JobRepository jobs;
    private final ContractorService contractors;
    private final WorkerService workers;

    public WorkerReviewService(WorkerReviewRepository reviews, ReviewReadRepository query, JobRepository jobs,
                               ContractorService contractors, WorkerService workers) {
        this.reviews = reviews;
        this.query = query;
        this.jobs = jobs;
        this.contractors = contractors;
        this.workers = workers;
    }

    public List<ReviewReadRepository.History> contractorHistory(String phone) {
        return query.contractorHistory(contractors.getContractorByPhone(phone).getContractorId());
    }

    public List<ReviewReadRepository.History> workerHistory(String phone) {
        return query.workerHistory(workers.getWorkerByPhone(phone).getWorkerId());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SavedReview save(String phone, Long jobId, Long workerId, int rating, String feedback, boolean editing) {
        if (rating < 1 || rating > 5 || (feedback != null && feedback.length() > 1000)) {
            throw new IllegalArgumentException("Rating must be 1 to 5 and feedback at most 1000 characters");
        }
        Long owner = contractors.getContractorByPhone(phone).getContractorId();
        var job = jobs.findByIdForUpdate(jobId).orElseThrow(() -> new IllegalStateException("Job not found"));
        if (!owner.equals(job.getContractorId())) throw new IllegalStateException("Access denied: You do not own this job");
        var evidence = query.evidence(jobId, workerId, owner)
                .orElseThrow(() -> new IllegalStateException("Review requires verified PRESENT attendance"));
        var existing = reviews.findByJobIdAndWorkerIdAndContractorId(jobId, workerId, owner);
        Instant at = Instant.now().truncatedTo(ChronoUnit.MICROS);
        WorkerReview review;
        if (editing) {
            review = existing.orElseThrow(() -> new IllegalStateException("Review not found"));
        } else {
            if (existing.isPresent()) throw new IllegalStateException("Review already exists for this engagement");
            review = new WorkerReview(jobId, workerId, owner, evidence, at);
        }
        review.rating = rating;
        review.feedback = feedback == null || feedback.isBlank() ? null : feedback.strip();
        review.updatedAt = at;
        review = reviews.save(review);
        return new SavedReview(review.id, review.rating, review.feedback, review.createdAt, review.updatedAt);
    }
}
