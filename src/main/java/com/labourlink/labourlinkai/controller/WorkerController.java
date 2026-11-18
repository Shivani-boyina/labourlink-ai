package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.dto.WorkerMatchingProfileUpdate;
import com.labourlink.labourlinkai.service.WorkerService;
import com.labourlink.labourlinkai.review.ReviewReadRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import com.labourlink.labourlinkai.dto.WorkerLocationUpdate;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/workers")
public class WorkerController {

    @Autowired
    private WorkerService workerService;
    @Autowired
    private ReviewReadRepository reviews;

    @PostMapping("/register")
    public Worker registerWorker(@Valid @RequestBody Worker worker) {
        worker.setWorkerId(null);
        return workerService.registerWorker(worker);
    }

    @PutMapping("/me/matching-profile")
    public Worker updateMatchingProfile(Principal principal, @Valid @RequestBody WorkerMatchingProfileUpdate update) {
        return rated(workerService.updateMatchingProfile(principal.getName(), update));
    }

    @GetMapping("/me")
    public Worker getMyProfile(Principal principal) {
        return rated(workerService.getWorkerByPhone(
                principal.getName()
        ));
    }

    @GetMapping
    public List<Worker> getAllWorkers() {
        return rated(workerService.getAllWorkers());
    }

    @GetMapping("/search")
    public List<Worker> searchWorkers(
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestParam(required = false) Double radiusKm) {

        return rated(workerService.searchWorkers(skill, location, latitude, longitude, radiusKm));
    }

    @PatchMapping("/me/location")
    public Worker updateMyLocation(Principal principal, @Valid @RequestBody WorkerLocationUpdate update) {
        return rated(workerService.updateWorkerLocation(principal.getName(), update.location(), update.shareLocation(), update.latitude(), update.longitude()));
    }

    private Worker rated(Worker worker) {
        rated(List.of(worker));
        return worker;
    }

    private List<Worker> rated(List<Worker> workers) {
        var ratings = reviews.ratings(workers.stream().map(Worker::getWorkerId).toList());
        for (Worker worker : workers) {
            var rating = ratings.getOrDefault(worker.getWorkerId(), ReviewReadRepository.Rating.UNRATED);
            worker.applyRating(rating.averageRating(), rating.reviewCount());
        }
        return workers;
    }
}
