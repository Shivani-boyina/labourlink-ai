package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.response.ApiResponse;
import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.service.ContractorService;


import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/contractors")
public class ContractorController {

    @Autowired
    private ContractorService contractorService;

    // CREATE
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Contractor>> registerContractor(
            @Valid @RequestBody Contractor contractor) {

        Contractor saved = contractorService.registerContractor(contractor);

        return new ResponseEntity<>(
                new ApiResponse<>(
                        "Contractor registered successfully",
                        "success",
                        saved
                ),
                HttpStatus.CREATED
        );
    }

    // READ ALL
    @GetMapping
public ResponseEntity<ApiResponse<List<Contractor>>> getAllContractors() {

    List<Contractor> contractors = contractorService.getAllContractors();

    return ResponseEntity.ok(
            new ApiResponse<>(
                    "Contractors fetched successfully",
                    "success",
                    contractors
            )
    );
}

    // DELETE
    @DeleteMapping("/{id}")
public ResponseEntity<ApiResponse<String>> deleteContractor(@PathVariable Long id) {

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
public ResponseEntity<ApiResponse<List<Contractor>>> searchByLocation(@RequestParam String location) {

    List<Contractor> contractors = contractorService.searchByLocation(location);

    return ResponseEntity.ok(
            new ApiResponse<>(
                    "Search results fetched successfully",
                    "success",
                    contractors
            )
    );
}
}