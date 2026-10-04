package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Contractor;
import java.util.List;

public interface ContractorService {

    Contractor registerContractor(Contractor contractor);

    List<Contractor> getAllContractors();
    List<Contractor> getContractorsByLocation(String location);

    List<Contractor> searchByLocation(String location);
    void deleteContractor(Long id);

    void setPassword(Long id, String password);
}