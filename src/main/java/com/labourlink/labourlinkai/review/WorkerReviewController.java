package com.labourlink.labourlinkai.review;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/reviews")
public class WorkerReviewController {
    private final WorkerReviewService reviews;
    public WorkerReviewController(WorkerReviewService reviews) { this.reviews = reviews; }

    record Input(@NotNull @Min(1) @Max(5) Integer rating, @Size(max = 1000) String feedback) {}

    @GetMapping("/contractor")
    public List<ReviewReadRepository.History> engagements(Principal principal) {
        return reviews.contractorHistory(principal.getName());
    }

    @GetMapping("/worker")
    public List<ReviewReadRepository.History> myReviews(Principal principal) {
        return reviews.workerHistory(principal.getName());
    }

    @PostMapping("/contractor/jobs/{jobId}/workers/{workerId}")
    public WorkerReviewService.SavedReview create(Principal principal, @PathVariable Long jobId,
                                                    @PathVariable Long workerId, @Valid @RequestBody Input input) {
        return reviews.save(principal.getName(), jobId, workerId, input.rating(), input.feedback(), false);
    }

    @PutMapping("/contractor/jobs/{jobId}/workers/{workerId}")
    public WorkerReviewService.SavedReview edit(Principal principal, @PathVariable Long jobId,
                                                  @PathVariable Long workerId, @Valid @RequestBody Input input) {
        return reviews.save(principal.getName(), jobId, workerId, input.rating(), input.feedback(), true);
    }
}
