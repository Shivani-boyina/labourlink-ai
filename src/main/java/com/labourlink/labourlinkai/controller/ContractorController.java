package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.response.ApiResponse;
import com.labourlink.labourlinkai.response.ContractorResponse;
import com.labourlink.labourlinkai.service.ContractorService;

import jakarta.validation.Valid;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/contractors")
public class ContractorController {

    @Autowired
    private ContractorService contractorService;

    // CREATE
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<ContractorResponse>> registerContractor(
            @Valid @RequestBody Contractor contractor) {

        Contractor saved = contractorService.registerContractor(contractor);

        ContractorResponse response =
                new ContractorResponse(saved);

        return new ResponseEntity<>(
                new ApiResponse<>(
                        "Contractor registered successfully",
                        "success",
                        response
                ),
                HttpStatus.CREATED
        );
    }

    // READ ALL
    @GetMapping
    public ResponseEntity<ApiResponse<List<ContractorResponse>>> getAllContractors() {

        List<Contractor> contractors =
                contractorService.getAllContractors();

        List<ContractorResponse> responses =
                contractors.stream()
                        .map(ContractorResponse::new)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(
                new ApiResponse<>(
                        "Contractors fetched successfully",
                        "success",
                        responses
                )
        );
    }

    // DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteContractor(
            @PathVariable Long id) {

        contractorService.deleteContractor(id);

        return ResponseEntity.ok(
                new ApiResponse<>(
                        "Contractor deleted successfully",
                        "success",
                        "Deleted ID: " + id
                )
        );
    }

    // SEARCH
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<ContractorResponse>>> searchByLocation(
            @RequestParam String location) {

        List<Contractor> contractors =
                contractorService.searchByLocation(location);

        List<ContractorResponse> responses =
                contractors.stream()
                        .map(ContractorResponse::new)
                        .collect(Collectors.toList());

        return ResponseEntity.ok(
                new ApiResponse<>(
                        "Search results fetched successfully",
                        "success",
                        responses
                )
        );
    }
}