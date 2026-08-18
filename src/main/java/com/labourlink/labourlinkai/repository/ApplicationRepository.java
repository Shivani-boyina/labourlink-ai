package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {

    long countByJobIdAndStatus(Long jobId, String status);
}