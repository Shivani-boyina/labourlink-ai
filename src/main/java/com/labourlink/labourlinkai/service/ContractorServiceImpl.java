package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.entity.Contractor;
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

        if (contractor.getPassword() == null ||
                contractor.getPassword().isBlank()) {

            throw new RuntimeException("Password is required");
        }

        contractor.setPassword(
                passwordEncoder.encode(contractor.getPassword())
        );

        return contractorRepository.save(contractor);
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
    @Override
public void setPassword(Long id, String password) {

    if (password == null || password.isBlank()) {
        throw new RuntimeException("Password is required");
    }

    Contractor contractor = contractorRepository.findById(id)
            .orElseThrow(() ->
                    new RuntimeException(
                            "Contractor not found with id: " + id
                    )
            );

    contractor.setPassword(
            passwordEncoder.encode(password)
    );

    contractorRepository.save(contractor);
}
}