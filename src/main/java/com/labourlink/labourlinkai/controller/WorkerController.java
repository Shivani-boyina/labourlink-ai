package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.service.WorkerService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
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

    @GetMapping("/me")
    public Worker getMyProfile(Principal principal) {
        return workerService.getWorkerByPhone(
                principal.getName()
        );
    }

    @GetMapping
    public List<Worker> getAllWorkers() {
        return workerService.getAllWorkers();
    }
}