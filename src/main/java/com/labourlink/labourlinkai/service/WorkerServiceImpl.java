package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Worker;
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

        if (worker.getPassword() == null ||
                worker.getPassword().isBlank()) {

            throw new RuntimeException("Password is required");
        }

        worker.setPassword(
                passwordEncoder.encode(worker.getPassword())
        );

        return workerRepository.save(worker);
    }

    @Override
    public List<Worker> getAllWorkers() {
        return workerRepository.findAll();
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

        // Treat empty or whitespace-only values as missing.
        skill = (skill == null || skill.isBlank()) ? null : skill.trim();
        location = (location == null || location.isBlank())
                ? null : location.trim();

        if (skill != null && location != null) {
            return workerRepository.findBySkillIgnoreCaseAndLocationIgnoreCase(
                    skill, location
            );
        }

        if (skill != null) {
            return workerRepository.findBySkillIgnoreCase(skill);
        }

        if (location != null) {
            return workerRepository.findByLocationIgnoreCase(location);
        }

        return workerRepository.findAll();
    }
}