package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.dto.WorkerMatchingProfileUpdate;

import java.util.List;

public interface WorkerService {

    Worker registerWorker(Worker worker);
    Worker updateMatchingProfile(String phone, WorkerMatchingProfileUpdate update);

    List<Worker> getAllWorkers();

    Worker getWorkerByPhone(String phone);

    List<Worker> searchWorkers(String skill, String location);
    List<Worker> searchWorkers(String skill, String location, Double latitude, Double longitude, Double radiusKm);
    Worker updateWorkerLocation(String phone, String location, boolean shareLocation, Double latitude, Double longitude);
}
