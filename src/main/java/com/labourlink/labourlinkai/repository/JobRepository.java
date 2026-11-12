package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;

import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByRequiredSkill(String skill);
    List<Job> findByLocation(String location);
    List<Job> findByStatus(String status);

    List<Job> findByStatusAndContractorId(String status, Long contractorId);

    List<Job> findByContractorId(Long contractorId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from Job j where j.jobId = :jobId")
    java.util.Optional<Job> findByIdForUpdate(@Param("jobId") Long jobId);

}
