package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.dto.ArchivedApplicationDTO;
import com.labourlink.labourlinkai.dto.HiringSelectionDTO;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.ArchivedApplicationHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class HiringHistoryService {
    private final ApplicationRepository applications;
    private final ArchivedApplicationHistoryRepository archives;
    private final ContractorService contractors;
    private final WorkerService workers;

    public HiringHistoryService(ApplicationRepository applications, ArchivedApplicationHistoryRepository archives,
                                ContractorService contractors, WorkerService workers) {
        this.applications = applications;
        this.archives = archives;
        this.contractors = contractors;
        this.workers = workers;
    }

    public List<HiringSelectionDTO> contractorSelections(String contractorPhone) {
        return applications.findOwnedSelections(contractors.getContractorByPhone(contractorPhone).getContractorId());
    }

    public List<ArchivedApplicationDTO> workerArchive(String workerPhone) {
        return archives.findVisibleToWorker(workers.getWorkerByPhone(workerPhone).getWorkerId());
    }
}
