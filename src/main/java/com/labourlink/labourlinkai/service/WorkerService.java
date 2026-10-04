package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Worker;

import java.util.List;

public interface WorkerService {

    Worker registerWorker(Worker worker);

    List<Worker> getAllWorkers();

    List<Worker> searchWorkers(String skill, String location);
}