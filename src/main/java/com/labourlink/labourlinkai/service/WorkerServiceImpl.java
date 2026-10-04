package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.entity.Worker;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class WorkerServiceImpl implements WorkerService {

    @Autowired
    private WorkerRepository workerRepository;

    @Override
    public Worker registerWorker(Worker worker) {
        return workerRepository.save(worker);
    }

    @Override
    public List<Worker> getAllWorkers() {
        return workerRepository.findAll();
    }

    @Override
    public List<Worker> searchWorkers(String skill, String location) {

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