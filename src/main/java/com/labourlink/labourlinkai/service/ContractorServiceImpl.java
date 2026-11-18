package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.dto.ContractorRegionUpdate;
import org.springframework.transaction.annotation.Transactional;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ContractorServiceImpl implements ContractorService {

    @Autowired
    private ContractorRepository contractorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public Contractor registerContractor(Contractor contractor) {
        contractor.setState(ProfileText.optional(contractor.getState()));
        contractor.setDistrict(ProfileText.optional(contractor.getDistrict()));

        if (contractor.getPassword() == null ||
                contractor.getPassword().isBlank()) {

            throw new RuntimeException("Password is required");
        }

        if (contractor.getPassword().length() < 6) {
            throw new RuntimeException("Password must be at least 6 characters");
        }
        if (contractorRepository.findByPhone(contractor.getPhone()).isPresent()) {
            throw new RuntimeException("Phone already registered");
        }

        contractor.setPassword(
                passwordEncoder.encode(contractor.getPassword())
        );

        return contractorRepository.save(contractor);
    }

    @Transactional
    @Override
    public Contractor updateRegion(String phone, ContractorRegionUpdate update) {
        Contractor contractor = getContractorByPhone(phone);
        contractor.setState(ProfileText.optional(update.state()));
        contractor.setDistrict(ProfileText.optional(update.district()));
        return contractorRepository.save(contractor);
    }

    @Override
    public Contractor getContractorByPhone(String phone) {
        return contractorRepository.findByPhone(phone)
                .orElseThrow(() -> new RuntimeException("Contractor not found"));
    }

    @Override
    public List<Contractor> getAllContractors() {
        return contractorRepository.findAll();
    }

    @Override
    public List<Contractor> getContractorsByLocation(String location) {
        return contractorRepository.findByLocation(location);
    }

    @Override
    public List<Contractor> searchByLocation(String location) {
        return contractorRepository
                .findByLocationContainingIgnoreCase(location);
    }

    @Override
    public void deleteContractor(Long id) {

        if (!contractorRepository.existsById(id)) {
            throw new RuntimeException(
                    "Contractor not found with id: " + id
            );
        }

        contractorRepository.deleteById(id);
    }
}
