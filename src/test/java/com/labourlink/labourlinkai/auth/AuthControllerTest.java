package com.labourlink.labourlinkai.auth;

import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.security.JwtUtil;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ContractorRepository contractorRepository;

    @Autowired
    private WorkerRepository workerRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    private static final String CONTRACTOR_PHONE = "9111111111";
    private static final String CONTRACTOR_PASSWORD = "Password123";
    private static final String WORKER_PHONE = "9222222222";
    private static final String WORKER_PASSWORD = "Password456";

    private Long contractorId;
    private Long workerId;

    @BeforeEach
    void setUp() {
        contractorRepository.findByPhone(CONTRACTOR_PHONE).ifPresent(contractorRepository::delete);
        workerRepository.findByPhone(WORKER_PHONE).ifPresent(workerRepository::delete);

        Contractor contractor = new Contractor();
        contractor.setContractorName("Integration Test Contractor");
        contractor.setCompanyName("Test Build Corp");
        contractor.setPhone(CONTRACTOR_PHONE);
        contractor.setLocation("Benz Circle");
        contractor.setPassword(passwordEncoder.encode(CONTRACTOR_PASSWORD));
        contractorId = contractorRepository.save(contractor).getContractorId();

        Worker worker = new Worker();
        worker.setName("Integration Test Worker");
        worker.setPhone(WORKER_PHONE);
        worker.setSkill("Mason");
        worker.setExperience(4);
        worker.setLocation("Benz Circle");
        worker.setAvailability(true);
        worker.setPassword(passwordEncoder.encode(WORKER_PASSWORD));
        workerId = workerRepository.save(worker).getWorkerId();
    }

    @Test
    @DisplayName("Contractor login with valid credentials returns 200 and AuthResponse")
    void contractorLogin_valid_returns200() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("phone", CONTRACTOR_PHONE)
                        .param("password", CONTRACTOR_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.role").value("CONTRACTOR"))
                .andExpect(jsonPath("$.phone").value(CONTRACTOR_PHONE))
                .andExpect(jsonPath("$.userId").value(contractorId));
    }

    @Test
    @DisplayName("Contractor login with wrong password returns 401")
    void contractorLogin_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("phone", CONTRACTOR_PHONE)
                        .param("password", "badPassword"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid phone number or password"));
    }

    @Test
    @DisplayName("Worker login with valid credentials returns 200 and AuthResponse")
    void workerLogin_valid_returns200() throws Exception {
        mockMvc.perform(post("/auth/worker/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("phone", WORKER_PHONE)
                        .param("password", WORKER_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.role").value("WORKER"))
                .andExpect(jsonPath("$.phone").value(WORKER_PHONE))
                .andExpect(jsonPath("$.userId").value(workerId));
    }

    @Test
    @DisplayName("Worker login with wrong password returns 401")
    void workerLogin_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/auth/worker/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("phone", WORKER_PHONE)
                        .param("password", "badPassword"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid phone number or password"));
    }

    @Test
    @DisplayName("GET /auth/me returns contractor profile from verified JWT")
    void getMe_contractor_returnsProfile() throws Exception {
        String token = jwtUtil.generateToken(CONTRACTOR_PHONE, "CONTRACTOR");

        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CONTRACTOR"))
                .andExpect(jsonPath("$.phone").value(CONTRACTOR_PHONE))
                .andExpect(jsonPath("$.userId").value(contractorId));
    }

    @Test
    @DisplayName("GET /auth/me returns worker profile from verified JWT")
    void getMe_worker_returnsProfile() throws Exception {
        String token = jwtUtil.generateToken(WORKER_PHONE, "WORKER");

        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("WORKER"))
                .andExpect(jsonPath("$.phone").value(WORKER_PHONE))
                .andExpect(jsonPath("$.userId").value(workerId));
    }

    @Test
    @DisplayName("GET /auth/me without token returns 401 or 403")
    void getMe_noToken_fails() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(s == 401 || s == 403);
                });
    }
}
