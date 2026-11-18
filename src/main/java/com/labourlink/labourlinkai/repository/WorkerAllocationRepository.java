package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.dto.AllocationDTO;
import com.labourlink.labourlinkai.entity.WorkerAllocation;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

public interface WorkerAllocationRepository extends JpaRepository<WorkerAllocation, Long> {
    String SUMMARY = """
            select new com.labourlink.labourlinkai.dto.AllocationDTO(
                a.allocationId, a.applicationId, a.jobId, j.title, a.workerId, w.name,
                a.status, a.allocatedAt, a.startDate, a.endDate)
            from WorkerAllocation a join Job j on j.jobId = a.jobId
            join Worker w on w.workerId = a.workerId
            """;

    @Query(SUMMARY + " where a.workerId = :id order by a.allocatedAt desc, a.allocationId desc")
    List<AllocationDTO> listByWorker(@Param("id") Long id);

    @Query(SUMMARY + " where a.contractorId = :id and j.contractorId = :id order by a.allocatedAt desc, a.allocationId desc")
    List<AllocationDTO> listByContractor(@Param("id") Long id);

    @Query("select a.jobId from WorkerAllocation a where a.allocationId = :id")
    Optional<Long> findJobId(@Param("id") Long id);

    @Query("select a.status from WorkerAllocation a where a.applicationId = :id")
    Optional<WorkerAllocation.Status> findStatusByApplicationId(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from WorkerAllocation a where a.allocationId = :id")
    Optional<WorkerAllocation> findForUpdate(@Param("id") Long id);

    @Query("""
            select count(a) from WorkerAllocation a where a.workerId = :workerId
            and ((a.status = ACTIVE and a.startDate is null)
            or (a.status in (ACTIVE, COMPLETED) and :date between a.startDate and a.endDate))
            """)
    long countConflictsOn(@Param("workerId") Long workerId, @Param("date") LocalDate date);
}
