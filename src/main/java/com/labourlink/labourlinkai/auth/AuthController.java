package com.labourlink.labourlinkai.auth;

import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private ContractorRepository contractorRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private final JwtUtil jwtUtil;

    @Autowired
    public AuthController(JwtUtil jwtUtil) {
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public String login(
            @RequestParam String phone,
            @RequestParam String password) {

        Optional<Contractor> contractor =
                contractorRepository.findByPhone(phone);

        if (contractor.isEmpty()) {
            return "Invalid phone number or password";
        }

        Contractor existingContractor = contractor.get();

        if (existingContractor.getPassword() == null ||
                existingContractor.getPassword().isBlank()) {

            return "Account requires password setup";
        }

        if (!passwordEncoder.matches(
                password,
                existingContractor.getPassword())) {

            return "Invalid phone number or password";
        }

        return jwtUtil.generateToken(
                existingContractor.getPhone()
        );
    }
}