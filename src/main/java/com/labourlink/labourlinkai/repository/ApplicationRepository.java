package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    long countByJobIdAndStatus(Long jobId, String status);

    boolean existsByJobIdAndWorkerId(Long jobId, Long workerId);

    List<Application> findByWorkerId(Long workerId);

    List<Application> findByJobId(Long jobId);

    Optional<Application> findByJobIdAndWorkerId(Long jobId, Long workerId);
}
