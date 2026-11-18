package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.dto.WorkerMatchingProfileUpdate;
import org.springframework.transaction.annotation.Transactional;
import com.labourlink.labourlinkai.repository.WorkerRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WorkerServiceImpl implements WorkerService {

    @Autowired
    private WorkerRepository workerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public Worker registerWorker(Worker worker) {
        worker.setCategory(ProfileText.optional(worker.getCategory()));
        worker.setState(ProfileText.optional(worker.getState()));
        worker.setDistrict(ProfileText.optional(worker.getDistrict()));

        if (worker.getPassword() == null ||
                worker.getPassword().isBlank()) {

            throw new RuntimeException("Password is required");
        }

        if (worker.getPassword().length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters");
        }
        if (workerRepository.findByPhone(worker.getPhone()).isPresent()) {
            throw new RuntimeException("Phone already registered");
        }

        worker.setPassword(
                passwordEncoder.encode(worker.getPassword())
        );

        applySharedLocation(worker, worker.isLocationShared(), worker.getLatitude(), worker.getLongitude());

        return workerRepository.save(worker);
    }

    @Override
    public List<Worker> getAllWorkers() {
        return workerRepository.findAll();
    }

    @Transactional
    @Override
    public Worker updateMatchingProfile(String phone, WorkerMatchingProfileUpdate update) {
        Worker worker = getWorkerByPhone(phone);
        worker.setCategory(ProfileText.optional(update.category()));
        worker.setState(ProfileText.optional(update.state()));
        worker.setDistrict(ProfileText.optional(update.district()));
        worker.setExpectedWagePerDay(update.expectedWagePerDay());
        return workerRepository.save(worker);
    }

    @Override
    public Worker getWorkerByPhone(String phone) {

        return workerRepository.findByPhone(phone)
                .orElseThrow(() ->
                        new RuntimeException("Worker not found")
                );
    }

    @Override
    public List<Worker> searchWorkers(String skill, String location) {
        return searchWorkers(skill, location, null, null, null);
    }

    @Override
    public List<Worker> searchWorkers(String skill, String location, Double latitude, Double longitude, Double radiusKm) {

        // Treat empty or whitespace-only values as missing.
        skill = (skill == null || skill.isBlank()) ? null : skill.trim();
        location = (location == null || location.isBlank())
                ? null : location.trim();

        List<Worker> results;
        if (skill != null && location != null) {
            results = workerRepository.findBySkillIgnoreCaseAndLocationIgnoreCase(
                    skill, location
            );
        } else if (skill != null) results = workerRepository.findBySkillIgnoreCase(skill);
        else if (location != null) results = workerRepository.findByLocationIgnoreCase(location);
        else results = workerRepository.findAll();

        if (latitude == null && longitude == null) return results;
        if (latitude == null || longitude == null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Provide a valid latitude and longitude together");
        }
        double radius = radiusKm == null ? 25 : Math.max(1, Math.min(radiusKm, 100));
        return results.stream().filter(Worker::isLocationShared)
                .filter(worker -> worker.getLatitude() != null && worker.getLongitude() != null)
                .filter(worker -> distanceKm(latitude, longitude, worker.getLatitude(), worker.getLongitude()) <= radius)
                .toList();
    }

    @Override
    public Worker updateWorkerLocation(String phone, String location, boolean shareLocation, Double latitude, Double longitude) {
        Worker worker = getWorkerByPhone(phone);
        if (location == null || location.isBlank()) throw new IllegalArgumentException("Location is required");
        worker.setLocation(location.trim());
        applySharedLocation(worker, shareLocation, latitude, longitude);
        return workerRepository.save(worker);
    }

    private void applySharedLocation(Worker worker, boolean share, Double latitude, Double longitude) {
        worker.setLocationShared(share);
        if (!share) {
            worker.setLatitude(null);
            worker.setLongitude(null);
            return;
        }
        if (latitude == null || longitude == null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new IllegalArgumentException("Choose a valid location before sharing it");
        }
        // Round to approximately kilometre precision so the directory never exposes a home pin.
        worker.setLatitude(Math.round(latitude * 100.0) / 100.0);
        worker.setLongitude(Math.round(longitude * 100.0) / 100.0);
    }

    private double distanceKm(double lat1, double lon1, double lat2, double lon2) {
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
