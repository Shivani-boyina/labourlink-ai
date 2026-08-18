package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<Job, Long> {

    List<Job> findByRequiredSkill(String skill);
    List<Job> findByLocation(String location);
    List<Job> findByStatus(String status);

}