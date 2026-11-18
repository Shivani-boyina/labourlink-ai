package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.dto.ContractorRegionUpdate;
import java.util.List;

public interface ContractorService {

    Contractor registerContractor(Contractor contractor);
    Contractor updateRegion(String phone, ContractorRegionUpdate update);

    Contractor getContractorByPhone(String phone);

    List<Contractor> getAllContractors();
    List<Contractor> getContractorsByLocation(String location);

    List<Contractor> searchByLocation(String location);
    void deleteContractor(Long id);

}
