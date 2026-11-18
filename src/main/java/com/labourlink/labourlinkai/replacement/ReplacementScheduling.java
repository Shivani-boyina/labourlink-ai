package com.labourlink.labourlinkai.replacement;

import com.labourlink.labourlinkai.repository.WorkerRepository;
import org.springframework.stereotype.Service;
import java.time.LocalDate;

@Service
public class ReplacementScheduling {
    private final ReplacementCoverageRepository coverage;
    private final WorkerRepository workers;

    public ReplacementScheduling(ReplacementCoverageRepository coverage, WorkerRepository workers) {
        this.coverage = coverage;
        this.workers = workers;
    }

    // The worker row serializes replacement confirmation and permanent scheduling.
    public void lockAndCheckPermanentWork(Long workerId, LocalDate start, LocalDate end) {
        workers.findForUpdate(workerId).orElseThrow(() -> new IllegalStateException("Worker not found"));
        boolean conflict = start == null
                ? coverage.existsByWorkerIdAndWorkDateGreaterThanEqual(workerId, ReplacementService.today())
                : coverage.existsByWorkerIdAndWorkDateBetween(workerId, start, end);
        if (conflict) throw new IllegalStateException("Replacement coverage conflicts with this allocation schedule");
    }
}
