package com.labourlink.labourlinkai.auth;

import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private ContractorRepository contractorRepository;

    private JwtUtil jwtUtil = new JwtUtil();

    // LOGIN API
    @PostMapping("/login")
    public String login(@RequestParam String phone) {

        Optional<Contractor> contractor =
                contractorRepository.findAll()
                        .stream()
                        .filter(c -> phone.equals(c.getPhone()))
                        .findFirst();

        if (contractor.isEmpty()) {
            return "Invalid phone number";
        }

        // Generate JWT token
        String token = jwtUtil.generateToken(contractor.get().getPhone());

        return token;
    }
}