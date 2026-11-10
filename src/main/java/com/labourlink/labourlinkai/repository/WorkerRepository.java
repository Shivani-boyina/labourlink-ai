package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.Worker;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WorkerRepository extends JpaRepository<Worker, Long> {

    // Find worker by phone number (authentication/profile lookup)
    Optional<Worker> findByPhone(String phone);

    // Find workers by skill
    List<Worker> findBySkillIgnoreCase(String skill);

    // Find workers by location
    List<Worker> findByLocationIgnoreCase(String location);

    // Find workers by both skill and location
    List<Worker> findBySkillIgnoreCaseAndLocationIgnoreCase(
            String skill,
            String location
    );
}