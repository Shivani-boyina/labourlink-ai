package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.Contractor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContractorRepository extends JpaRepository<Contractor, Long> {

    Optional<Contractor> findByPhone(String phone);

    List<Contractor> findByLocation(String location);

    List<Contractor> findByLocationContainingIgnoreCase(String location);
}