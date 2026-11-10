
package com.labourlink.labourlinkai.auth;

import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.security.JwtUtil;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private final ContractorRepository contractorRepository;
    private final WorkerRepository workerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public AuthController(
            ContractorRepository contractorRepository,
            WorkerRepository workerRepository,
            PasswordEncoder passwordEncoder,
            JwtUtil jwtUtil) {

        this.contractorRepository = contractorRepository;
        this.workerRepository = workerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
    }

    // Contractor login
    @PostMapping("/login")
    public ResponseEntity<?> login(
            @RequestParam String phone,
            @RequestParam String password) {

        Optional<Contractor> contractor =
                contractorRepository.findByPhone(phone);

        if (contractor.isEmpty()) {
            return unauthorized();
        }

        Contractor existingContractor = contractor.get();

        if (existingContractor.getPassword() == null ||
                existingContractor.getPassword().isBlank() ||
                !passwordEncoder.matches(
                        password,
                        existingContractor.getPassword())) {

            return unauthorized();
        }

        String token = jwtUtil.generateToken(
                existingContractor.getPhone(),
                "CONTRACTOR"
        );

        AuthResponse response = new AuthResponse(
                token,
                existingContractor.getContractorId(),
                existingContractor.getPhone(),
                existingContractor.getContractorName(),
                "CONTRACTOR"
        );

        return ResponseEntity.ok(response);
    }

    // Worker login
    @PostMapping("/worker/login")
    public ResponseEntity<?> workerLogin(
            @RequestParam String phone,
            @RequestParam String password) {

        Optional<Worker> worker =
                workerRepository.findByPhone(phone);

        if (worker.isEmpty()) {
            return unauthorized();
        }

        Worker existingWorker = worker.get();

        if (existingWorker.getPassword() == null ||
                existingWorker.getPassword().isBlank() ||
                !passwordEncoder.matches(
                        password,
                        existingWorker.getPassword())) {

            return unauthorized();
        }

        String token = jwtUtil.generateToken(
                existingWorker.getPhone(),
                "WORKER"
        );

        AuthResponse response = new AuthResponse(
                token,
                existingWorker.getWorkerId(),
                existingWorker.getPhone(),
                existingWorker.getName(),
                "WORKER"
        );

        return ResponseEntity.ok(response);
    }

    private ResponseEntity<Map<String, String>> unauthorized() {
        return ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body(Map.of(
                        "message",
                        "Invalid phone number or password"
                ));
    }
}
