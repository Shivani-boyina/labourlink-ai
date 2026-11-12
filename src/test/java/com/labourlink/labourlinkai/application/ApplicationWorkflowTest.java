package com.labourlink.labourlinkai.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labourlink.labourlinkai.entity.Application;
import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApplicationWorkflowTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ContractorRepository contractorRepository;

    @Autowired
    private WorkerRepository workerRepository;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String CONTRACTOR_PHONE = "9333333331";
    private static final String OTHER_CONTRACTOR_PHONE = "9333333332";
    private static final String WORKER1_PHONE = "9444444441";
    private static final String WORKER2_PHONE = "9444444442";

    private Long contractorId;
    private Long otherContractorId;
    private Long worker1Id;
    private Long worker2Id;
    private Long jobId;

    private String contractorToken;
    private String otherContractorToken;
    private String worker1Token;
    private String worker2Token;

    @BeforeEach
    void setUp() {
        contractorRepository.findByPhone(CONTRACTOR_PHONE).ifPresent(contractorRepository::delete);
        contractorRepository.findByPhone(OTHER_CONTRACTOR_PHONE).ifPresent(contractorRepository::delete);
        workerRepository.findByPhone(WORKER1_PHONE).ifPresent(workerRepository::delete);
        workerRepository.findByPhone(WORKER2_PHONE).ifPresent(workerRepository::delete);

        Contractor c1 = new Contractor();
        c1.setContractorName("Primary Contractor");
        c1.setCompanyName("Alpha Builders");
        c1.setPhone(CONTRACTOR_PHONE);
        c1.setLocation("Vijayawada");
        c1.setPassword(passwordEncoder.encode("Pass123"));
        contractorId = contractorRepository.save(c1).getContractorId();

        Contractor c2 = new Contractor();
        c2.setContractorName("Second Contractor");
        c2.setCompanyName("Beta Construction");
        c2.setPhone(OTHER_CONTRACTOR_PHONE);
        c2.setLocation("Vijayawada");
        c2.setPassword(passwordEncoder.encode("Pass123"));
        otherContractorId = contractorRepository.save(c2).getContractorId();

        Worker w1 = new Worker();
        w1.setName("Worker One");
        w1.setPhone(WORKER1_PHONE);
        w1.setSkill("Mason");
        w1.setExperience(5);
        w1.setLocation("Vijayawada");
        w1.setAvailability(true);
        w1.setPassword(passwordEncoder.encode("Pass123"));
        worker1Id = workerRepository.save(w1).getWorkerId();

        Worker w2 = new Worker();
        w2.setName("Worker Two");
        w2.setPhone(WORKER2_PHONE);
        w2.setSkill("Mason");
        w2.setExperience(2);
        w2.setLocation("Vijayawada");
        w2.setAvailability(true);
        w2.setPassword(passwordEncoder.encode("Pass123"));
        worker2Id = workerRepository.save(w2).getWorkerId();

        Job job = new Job();
        job.setTitle("Masonry Work");
        job.setDescription("Site work needed");
        job.setRequiredSkill("Mason");
        job.setLocation("Vijayawada");
        job.setWagePerDay(950.0);
        job.setRequiredWorkers(1); // Capacity is exactly 1 worker
        job.setStatus("OPEN");
        job.setContractorId(contractorId);
        jobId = jobRepository.save(job).getJobId();

        contractorToken = jwtUtil.generateToken(CONTRACTOR_PHONE, "CONTRACTOR");
        otherContractorToken = jwtUtil.generateToken(OTHER_CONTRACTOR_PHONE, "CONTRACTOR");
        worker1Token = jwtUtil.generateToken(WORKER1_PHONE, "WORKER");
        worker2Token = jwtUtil.generateToken(WORKER2_PHONE, "WORKER");
    }

    @Test
    @DisplayName("Worker can apply for a job and identity is derived from JWT")
    void worker_applyForJob_success() throws Exception {
        mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.jobId").value(jobId))
                .andExpect(jsonPath("$.workerId").value(worker1Id))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("Duplicate application by same worker is rejected")
    void worker_duplicateApplication_rejected() throws Exception {
        // First application
        mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isOk());

        // Second application should fail
        mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(s == 400 || s == 500);
                });
    }

    @Test
    @DisplayName("Worker can view personal applications via GET /applications/my")
    void worker_getMyApplications_success() throws Exception {
        // Worker 1 applies
        mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isOk());

        // Worker 1 views their applications
        mockMvc.perform(get("/applications/my")
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].jobId").value(jobId))
                .andExpect(jsonPath("$[0].workerId").value(worker1Id))
                .andExpect(jsonPath("$[0].jobTitle").value("Masonry Work"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));

        // Worker 2 should see empty applications list
        mockMvc.perform(get("/applications/my")
                        .header("Authorization", "Bearer " + worker2Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("Contractor can view applicants for their own job")
    void contractor_viewJobApplicants_success() throws Exception {
        mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/applications/job/" + jobId)
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].workerId").value(worker1Id))
                .andExpect(jsonPath("$[0].workerName").value("Worker One"))
                .andExpect(jsonPath("$[0].status").value("PENDING"));
    }

    @Test
    @DisplayName("Other contractor cannot view applicants for a job they do not own")
    void otherContractor_cannotViewApplicants_denied() throws Exception {
        mockMvc.perform(get("/applications/job/" + jobId)
                        .header("Authorization", "Bearer " + otherContractorToken))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(s == 400 || s == 403 || s == 500);
                });
    }

    @Test
    @DisplayName("Contractor can accept application and capacity is enforced")
    void contractor_acceptAndCapacityEnforced() throws Exception {
        // Worker 1 applies
        String res1 = mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Application app1 = objectMapper.readValue(res1, Application.class);

        // Worker 2 applies
        String res2 = mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker2Token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        Application app2 = objectMapper.readValue(res2, Application.class);

        // Contractor accepts worker 1 (capacity: 1 required, 0 accepted -> allowed)
        mockMvc.perform(put("/applications/" + app1.getApplicationId() + "/status?status=ACCEPTED")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        // Contractor attempts to accept worker 2 (capacity full: 1/1 accepted -> must fail)
        mockMvc.perform(put("/applications/" + app2.getApplicationId() + "/status?status=ACCEPTED")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(s == 400 || s == 500);
                });
    }

    @Test
    @DisplayName("Worker cannot access contractor-only job creation or deletion")
    void worker_cannotCreateOrDeleteJobs() throws Exception {
        Job newJob = new Job();
        newJob.setTitle("Unauthorized Job");
        newJob.setRequiredSkill("Carpenter");
        newJob.setLocation("Vijayawada");
        newJob.setWagePerDay(800.0);
        newJob.setRequiredWorkers(2);
        newJob.setStatus("OPEN");

        mockMvc.perform(post("/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newJob))
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/jobs/" + jobId)
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Contractor cannot delete another contractor's job")
    void contractor_cannotDeleteOthersJob() throws Exception {
        mockMvc.perform(delete("/jobs/" + jobId)
                        .header("Authorization", "Bearer " + otherContractorToken))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertTrue(s == 400 || s == 403 || s == 500);
                });
    }
}
