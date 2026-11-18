package com.labourlink.labourlinkai.worker;

import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.service.WorkerServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class WorkerLocationServiceTest {
    private WorkerServiceImpl service;
    private WorkerRepository repository;

    @BeforeEach
    void setUp() {
        service = new WorkerServiceImpl();
        repository = mock(WorkerRepository.class);
        ReflectionTestUtils.setField(service, "workerRepository", repository);
        ReflectionTestUtils.setField(service, "passwordEncoder", mock(PasswordEncoder.class));
    }

    @Test
    void optInRoundsCoordinatesAndOptOutDeletesThem() {
        Worker worker = worker("worker-phone", 16.5062, 80.6480, true);
        when(repository.findByPhone("worker-phone")).thenReturn(Optional.of(worker));
        when(repository.save(worker)).thenReturn(worker);

        service.updateWorkerLocation("worker-phone", "Vijayawada", true, 16.5062, 80.6480);
        assertEquals(16.51, worker.getLatitude());
        assertEquals(80.65, worker.getLongitude());
        assertTrue(worker.isLocationShared());

        service.updateWorkerLocation("worker-phone", "Vijayawada", false, null, null);
        assertNull(worker.getLatitude());
        assertNull(worker.getLongitude());
    }

    @Test
    void radiusSearchReturnsOnlyOptedInWorkersInsideRadius() {
        Worker close = worker("near", 16.51, 80.65, true);
        Worker far = worker("far", 17.40, 80.65, true);
        Worker privateWorker = worker("private", 16.50, 80.65, false);
        when(repository.findBySkillIgnoreCase("Mason")).thenReturn(List.of(close, far, privateWorker));

        List<Worker> results = service.searchWorkers("Mason", null, 16.5062, 80.648, 25.0);

        assertEquals(List.of(close), results);
    }

    private Worker worker(String phone, double latitude, double longitude, boolean share) {
        Worker worker = new Worker();
        worker.setPhone(phone);
        worker.setSkill("Mason");
        worker.setLocation("Vijayawada");
        worker.setLatitude(latitude);
        worker.setLongitude(longitude);
        worker.setLocationShared(share);
        return worker;
    }
}
