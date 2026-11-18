package com.labourlink.labourlinkai.auth;

import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.security.JwtUtil;
import com.labourlink.labourlinkai.TestPhoneNumbers;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@ContextConfiguration(initializers = com.labourlink.labourlinkai.TestDatabaseSafetyInitializer.class)
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

    private String contractorPhone;
    private static final String CONTRACTOR_PASSWORD = "Password123";
    private String workerPhone;
    private static final String WORKER_PASSWORD = "Password456";

    private Long contractorId;
    private Long workerId;

    @BeforeEach
    void setUp() {
        contractorPhone = TestPhoneNumbers.next();
        workerPhone = TestPhoneNumbers.next();

        Contractor contractor = new Contractor();
        contractor.setContractorName("Integration Test Contractor");
        contractor.setCompanyName("Test Build Corp");
        contractor.setPhone(contractorPhone);
        contractor.setLocation("Benz Circle");
        contractor.setPassword(passwordEncoder.encode(CONTRACTOR_PASSWORD));
        contractorId = contractorRepository.save(contractor).getContractorId();

        Worker worker = new Worker();
        worker.setName("Integration Test Worker");
        worker.setPhone(workerPhone);
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
                        .param("phone", contractorPhone)
                        .param("password", CONTRACTOR_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.role").value("CONTRACTOR"))
                .andExpect(jsonPath("$.phone").value(contractorPhone))
                .andExpect(jsonPath("$.userId").value(contractorId));
    }

    @Test
    @DisplayName("Contractor login with wrong password returns 401")
    void contractorLogin_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("phone", contractorPhone)
                        .param("password", "badPassword"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid phone number or password"));
    }

    @Test
    @DisplayName("Worker login with valid credentials returns 200 and AuthResponse")
    void workerLogin_valid_returns200() throws Exception {
        mockMvc.perform(post("/auth/worker/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("phone", workerPhone)
                        .param("password", WORKER_PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.role").value("WORKER"))
                .andExpect(jsonPath("$.phone").value(workerPhone))
                .andExpect(jsonPath("$.userId").value(workerId));
    }

    @Test
    @DisplayName("Worker login with wrong password returns 401")
    void workerLogin_wrongPassword_returns401() throws Exception {
        mockMvc.perform(post("/auth/worker/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("phone", workerPhone)
                        .param("password", "badPassword"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid phone number or password"));
    }

    @Test
    @DisplayName("Worker registration stores a hashed password and permits worker login")
    void workerRegistration_thenLogin() throws Exception {
        String phone = TestPhoneNumbers.next();
        String password = "NewWorker123";
        mockMvc.perform(post("/workers/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"New Worker\",\"phone\":\"" + phone +
                                "\",\"password\":\"" + password +
                                "\",\"skill\":\"Mason\",\"experience\":3,\"location\":\"Guntur\",\"availability\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workerId").isNumber())
                .andExpect(jsonPath("$.password").doesNotExist());

        mockMvc.perform(post("/auth/worker/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("phone", phone)
                        .param("password", password))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("WORKER"))
                .andExpect(jsonPath("$.phone").value(phone));

        org.junit.jupiter.api.Assertions.assertTrue(
                passwordEncoder.matches(password,
                        workerRepository.findByPhone(phone).orElseThrow().getPassword()));
    }

    @Test
    @DisplayName("Contractor registration stores a hashed password and permits contractor login")
    void contractorRegistration_thenLogin() throws Exception {
        String phone = TestPhoneNumbers.next();
        String password = "NewContractor123";
        mockMvc.perform(post("/contractors/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"contractorName\":\"New Contractor\",\"companyName\":\"New Build Co\",\"phone\":\"" + phone +
                                "\",\"password\":\"" + password + "\",\"location\":\"Guntur\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.contractorId").isNumber())
                .andExpect(jsonPath("$.data.password").doesNotExist());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                        .param("phone", phone)
                        .param("password", password))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CONTRACTOR"))
                .andExpect(jsonPath("$.phone").value(phone));

        org.junit.jupiter.api.Assertions.assertTrue(
                passwordEncoder.matches(password,
                        contractorRepository.findByPhone(phone).orElseThrow().getPassword()));
    }

    @Test
    @DisplayName("GET /auth/me returns contractor profile from verified JWT")
    void getMe_contractor_returnsProfile() throws Exception {
        String token = jwtUtil.generateToken(contractorPhone, "CONTRACTOR");

        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("CONTRACTOR"))
                .andExpect(jsonPath("$.phone").value(contractorPhone))
                .andExpect(jsonPath("$.userId").value(contractorId));
    }

    @Test
    @DisplayName("GET /auth/me returns worker profile from verified JWT")
    void getMe_worker_returnsProfile() throws Exception {
        String token = jwtUtil.generateToken(workerPhone, "WORKER");

        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("WORKER"))
                .andExpect(jsonPath("$.phone").value(workerPhone))
                .andExpect(jsonPath("$.userId").value(workerId));
    }

    @Test
    @DisplayName("GET /auth/me without token returns 401")
    void getMe_noToken_fails() throws Exception {
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /auth/me with an invalid token returns 401")
    void getMe_invalidToken_returns401() throws Exception {
        mockMvc.perform(get("/auth/me")
                        .header("Authorization", "Bearer invalid.jwt.token"))
                .andExpect(status().isUnauthorized());
    }
}
