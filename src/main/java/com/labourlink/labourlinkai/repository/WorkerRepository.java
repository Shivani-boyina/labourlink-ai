package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WorkerRepository extends JpaRepository<Worker, Long> {

    List<Worker> findBySkillIgnoreCase(String skill);

    List<Worker> findByLocationIgnoreCase(String location);

    List<Worker> findBySkillIgnoreCaseAndLocationIgnoreCase(
            String skill,
            String location
    );
}