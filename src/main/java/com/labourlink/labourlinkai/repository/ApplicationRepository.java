package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.Application;
import com.labourlink.labourlinkai.dto.HiringSelectionDTO;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    long countByJobIdAndStatus(Long jobId, String status);

    @Query("""
            select count(a) from Application a where a.jobId = :jobId and a.status = 'ACCEPTED'
            and not exists (select x.allocationId from WorkerAllocation x
                where x.applicationId = a.applicationId and x.status = CANCELLED)
            """)
    long countOccupyingSlots(@Param("jobId") Long jobId);

    boolean existsByJobIdAndWorkerId(Long jobId, Long workerId);

    boolean existsByJobId(Long jobId);

    List<Application> findByWorkerId(Long workerId);

    List<Application> findByJobId(Long jobId);

    Optional<Application> findByJobIdAndWorkerId(Long jobId, Long workerId);

    @Query("select a.jobId from Application a where a.applicationId = :applicationId")
    Optional<Long> findJobIdByApplicationId(@Param("applicationId") Long applicationId);

    @Query("""
            select new com.labourlink.labourlinkai.dto.HiringSelectionDTO(
                a.applicationId, j.jobId, j.title, w.workerId, w.name, w.skill,
                a.applicationDate, a.acceptedAt)
            from Application a
            join Job j on j.jobId = a.jobId
            join Worker w on w.workerId = a.workerId
            where j.contractorId = :contractorId and a.status = 'ACCEPTED'
            order by a.acceptedAt desc, a.applicationId desc
            """)
    List<HiringSelectionDTO> findOwnedSelections(@Param("contractorId") Long contractorId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Application a where a.applicationId = :applicationId")
    Optional<Application> findByIdForUpdate(@Param("applicationId") Long applicationId);

}
