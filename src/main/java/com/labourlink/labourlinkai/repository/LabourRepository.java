package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.Labour;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LabourRepository extends JpaRepository<Labour, Long> {

    List<Labour> findBySkillIgnoreCase(String skill);

    List<Labour> findByLocationIgnoreCase(String location);
}