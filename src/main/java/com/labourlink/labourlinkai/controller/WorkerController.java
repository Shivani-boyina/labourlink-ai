package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.service.WorkerService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/workers")
public class WorkerController {

    @Autowired
    private WorkerService workerService;

    @PostMapping("/register")
    public Worker registerWorker(@RequestBody Worker worker) {
        return workerService.registerWorker(worker);
    }

    @GetMapping
    public List<Worker> getAllWorkers() {
        return workerService.getAllWorkers();
    }

    @GetMapping("/search")
    public List<Worker> searchWorkers(
            @RequestParam(required = false) String skill,
            @RequestParam(required = false) String location) {

        return workerService.searchWorkers(skill, location);
    }
}