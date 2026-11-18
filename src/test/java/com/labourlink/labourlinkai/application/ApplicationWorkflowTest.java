package com.labourlink.labourlinkai.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.repository.ApplicationRepository;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.security.JwtUtil;
import com.labourlink.labourlinkai.service.HiringHistoryService;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.hamcrest.Matchers.contains;
import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
@ContextConfiguration(initializers = com.labourlink.labourlinkai.TestDatabaseSafetyInitializer.class)
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

    @Autowired
    private HiringHistoryService hiringHistory;

    @Autowired
    private JdbcTemplate jdbc;

    private String contractorPhone;
    private String otherContractorPhone;
    private String worker1Phone;
    private String worker2Phone;

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
        contractorPhone = TestPhoneNumbers.next();
        otherContractorPhone = TestPhoneNumbers.next();
        worker1Phone = TestPhoneNumbers.next();
        worker2Phone = TestPhoneNumbers.next();

        Contractor c1 = new Contractor();
        c1.setContractorName("Primary Contractor");
        c1.setCompanyName("Alpha Builders");
        c1.setPhone(contractorPhone);
        c1.setLocation("Vijayawada");
        c1.setPassword(passwordEncoder.encode("Pass123"));
        contractorId = contractorRepository.save(c1).getContractorId();

        Contractor c2 = new Contractor();
        c2.setContractorName("Second Contractor");
        c2.setCompanyName("Beta Construction");
        c2.setPhone(otherContractorPhone);
        c2.setLocation("Vijayawada");
        c2.setPassword(passwordEncoder.encode("Pass123"));
        otherContractorId = contractorRepository.save(c2).getContractorId();

        Worker w1 = new Worker();
        w1.setName("Worker One");
        w1.setPhone(worker1Phone);
        w1.setSkill("Mason");
        w1.setExperience(5);
        w1.setLocation("Vijayawada");
        w1.setAvailability(true);
        w1.setPassword(passwordEncoder.encode("Pass123"));
        worker1Id = workerRepository.save(w1).getWorkerId();

        Worker w2 = new Worker();
        w2.setName("Worker Two");
        w2.setPhone(worker2Phone);
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

        contractorToken = jwtUtil.generateToken(contractorPhone, "CONTRACTOR");
        otherContractorToken = jwtUtil.generateToken(otherContractorPhone, "CONTRACTOR");
        worker1Token = jwtUtil.generateToken(worker1Phone, "WORKER");
        worker2Token = jwtUtil.generateToken(worker2Phone, "WORKER");
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
    @DisplayName("Worker identity and application status cannot be supplied by the request")
    void worker_cannotImpersonateAnotherWorkerOrSetStatus() throws Exception {
        String body = "{\"jobId\":" + jobId + ",\"workerId\":" + worker2Id + ",\"status\":\"ACCEPTED\"}";

        mockMvc.perform(post("/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.workerId").value(worker1Id))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @DisplayName("Only contractors can search the worker directory")
    void workerSearch_isContractorOnly() throws Exception {
        mockMvc.perform(get("/workers/search")
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/workers/search")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/applications/my")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Published open jobs are visible without restricting by contractor ownership")
    void openJobs_arePubliclyDiscoverable() throws Exception {
        mockMvc.perform(get("/jobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.jobId == " + jobId + ")].status").value(contains("OPEN")));
    }

    @Test
    @DisplayName("Worker recommendations score skill, location, experience and expected wage")
    void worker_recommendationsUseTransparentProfileScore() throws Exception {
        Job job = jobRepository.findById(jobId).orElseThrow();
        job.setMinimumExperience(5);
        job.setDurationDays(7);
        jobRepository.save(job);

        Worker worker = workerRepository.findById(worker1Id).orElseThrow();
        worker.setExpectedWagePerDay(800.0);
        workerRepository.save(worker);
        Worker unavailable = workerRepository.findById(worker2Id).orElseThrow();
        unavailable.setAvailability(false);
        workerRepository.save(unavailable);

        String fixture = "$[?(@.job.jobId == " + jobId + ")]";
        mockMvc.perform(get("/jobs/recommendations/me")
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath(fixture + ".matchingScore").value(contains(100)))
                .andExpect(jsonPath(fixture + ".job.minimumExperience").value(contains(5)))
                .andExpect(jsonPath(fixture + ".job.durationDays").value(contains(7)));

        mockMvc.perform(get("/jobs/recommendations/me")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Contractor job ownership and published status come from the authenticated account")
    void contractor_createJob_usesAuthenticatedOwnerAndOpenStatus() throws Exception {
        Job requested = new Job();
        requested.setJobId(jobId);
        requested.setTitle("Plumber Work");
        requested.setRequiredSkill("Plumber");
        requested.setLocation("Vijayawada");
        requested.setWagePerDay(900.0);
        requested.setRequiredWorkers(2);
        requested.setStatus("CLOSED");
        requested.setContractorId(otherContractorId);

        String response = mockMvc.perform(post("/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requested))
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contractorId").value(contractorId))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andReturn().getResponse().getContentAsString();

        Long createdId = objectMapper.readTree(response).path("jobId").asLong();
        org.junit.jupiter.api.Assertions.assertNotEquals(jobId, createdId);
        org.junit.jupiter.api.Assertions.assertEquals(contractorId,
                jobRepository.findById(createdId).orElseThrow().getContractorId());
        org.junit.jupiter.api.Assertions.assertEquals(contractorId,
                jobRepository.findById(jobId).orElseThrow().getContractorId());
    }

    @Test
    @DisplayName("A contractor cannot update an application for another contractor's job")
    void otherContractor_cannotUpdateApplicationStatus() throws Exception {
        String response = mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long applicationId = objectMapper.readTree(response).path("applicationId").asLong();

        mockMvc.perform(put("/applications/" + applicationId + "/status?status=ACCEPTED")
                        .header("Authorization", "Bearer " + otherContractorToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Worker cannot approve or reject an application")
    void worker_cannotUpdateApplicationStatus() throws Exception {
        String response = mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long applicationId = objectMapper.readTree(response).path("applicationId").asLong();

        mockMvc.perform(put("/applications/" + applicationId + "/status?status=ACCEPTED")
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Contractor can edit and close only their own jobs")
    void contractor_canEditAndCloseOwnJob() throws Exception {
        Job changes = new Job();
        changes.setJobId(jobId + 1000);
        changes.setTitle("Updated Masonry Work");
        changes.setDescription("Updated work details");
        changes.setRequiredSkill("Mason");
        changes.setLocation("Guntur");
        changes.setWagePerDay(1100.0);
        changes.setRequiredWorkers(2);
        changes.setStatus("CLOSED");
        changes.setContractorId(otherContractorId);

        mockMvc.perform(put("/jobs/" + jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(changes))
                        .header("Authorization", "Bearer " + otherContractorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/jobs/" + jobId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(changes))
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Updated Masonry Work"))
                .andExpect(jsonPath("$.contractorId").value(contractorId))
                .andExpect(jsonPath("$.status").value("OPEN"));

        mockMvc.perform(patch("/jobs/" + jobId + "/close")
                        .header("Authorization", "Bearer " + otherContractorToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/jobs/" + jobId + "/close")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }

    @Test
    @DisplayName("Closed jobs are visible only to their owning contractor")
    void closedJob_isPrivateToOwner() throws Exception {
        mockMvc.perform(patch("/jobs/" + jobId + "/close")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/jobs/" + jobId))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/jobs/" + jobId)
                        .header("Authorization", "Bearer " + otherContractorToken))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/jobs/" + jobId)
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));
    }

    @Test
    @DisplayName("Rejected applications do not consume worker capacity")
    void rejectedApplication_doesNotConsumeCapacity() throws Exception {
        String response = mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker1Token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        long applicationId = objectMapper.readTree(response).path("applicationId").asLong();

        mockMvc.perform(put("/applications/" + applicationId + "/status?status=REJECTED")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker2Token))
                .andExpect(status().isOk());
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
                    org.junit.jupiter.api.Assertions.assertEquals(409, s);
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
    void approvedScratchArchiveGrantReturnsOnlyTheOriginalWorkersRecord() {
        long archiveId = 950001L;
        jdbc.update("""
                INSERT INTO archived_application_history
                (application_id, job_id, job_title, original_worker_id, original_status, application_date)
                VALUES (?, ?, 'Scratch archived job', ?, 'ACCEPTED', '2026-01-15')
                """, archiveId, jobId, worker1Id);
        assertThat(hiringHistory.workerArchive(worker1Phone)).isEmpty();
        jdbc.update("INSERT INTO archived_application_worker_access (application_id, worker_id) VALUES (?, ?)", archiveId, worker1Id);
        assertThat(hiringHistory.workerArchive(worker1Phone))
                .singleElement().satisfies(row -> assertThat(row.applicationId()).isEqualTo(archiveId));
        assertThat(hiringHistory.workerArchive(worker2Phone)).isEmpty();
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
                    org.junit.jupiter.api.Assertions.assertEquals(403, s);
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

        long app1Id = objectMapper.readTree(res1).path("applicationId").asLong();

        // Worker 2 applies
        String res2 = mockMvc.perform(post("/applications?jobId=" + jobId)
                        .header("Authorization", "Bearer " + worker2Token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        long app2Id = objectMapper.readTree(res2).path("applicationId").asLong();

        // Contractor accepts worker 1 (capacity: 1 required, 0 accepted -> allowed)
        mockMvc.perform(put("/applications/" + app1Id + "/status?status=ACCEPTED")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        // Contractor attempts to accept worker 2 (capacity full: 1/1 accepted -> must fail)
        mockMvc.perform(put("/applications/" + app2Id + "/status?status=ACCEPTED")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(result -> {
                    int s = result.getResponse().getStatus();
                    org.junit.jupiter.api.Assertions.assertEquals(409, s);
                });
    }

    @Test
    @DisplayName("Three worker allocation persists decisions and prevents over-allocation")
    void contractor_allocatesThreePositionsAndRejectsFourthAcceptance() throws Exception {
        Job allocationJob = new Job();
        allocationJob.setTitle("Three Mason Positions");
        allocationJob.setRequiredSkill("Mason");
        allocationJob.setLocation("Vijayawada");
        allocationJob.setWagePerDay(1000.0);
        allocationJob.setRequiredWorkers(3);
        allocationJob.setStatus("OPEN");
        allocationJob.setContractorId(contractorId);
        Long allocationJobId = jobRepository.save(allocationJob).getJobId();

        String worker3Phone = TestPhoneNumbers.next();
        String worker4Phone = TestPhoneNumbers.next();
        String worker5Phone = TestPhoneNumbers.next();
        Worker worker3 = new Worker();
        worker3.setName("Worker Three"); worker3.setPhone(worker3Phone); worker3.setSkill("Mason");
        worker3.setExperience(3); worker3.setLocation("Vijayawada"); worker3.setAvailability(true);
        worker3.setExpectedWagePerDay(900.0); worker3.setPassword(passwordEncoder.encode("Pass123"));
        workerRepository.save(worker3);
        Worker worker4 = new Worker();
        worker4.setName("Worker Four"); worker4.setPhone(worker4Phone); worker4.setSkill("Mason");
        worker4.setExperience(1); worker4.setLocation("Vijayawada"); worker4.setAvailability(true);
        worker4.setPassword(passwordEncoder.encode("Pass123"));
        workerRepository.save(worker4);
        Worker worker5 = new Worker();
        worker5.setName("Worker Five"); worker5.setPhone(worker5Phone); worker5.setSkill("Mason");
        worker5.setExperience(1); worker5.setLocation("Vijayawada"); worker5.setAvailability(true);
        worker5.setPassword(passwordEncoder.encode("Pass123"));
        workerRepository.save(worker5);

        String worker3Token = jwtUtil.generateToken(worker3Phone, "WORKER");
        String worker4Token = jwtUtil.generateToken(worker4Phone, "WORKER");
        String worker5Token = jwtUtil.generateToken(worker5Phone, "WORKER");
        long[] applicationIds = new long[5];
        String[] tokens = {worker1Token, worker2Token, worker3Token, worker4Token, worker5Token};
        for (int i = 0; i < tokens.length; i++) {
            String response = mockMvc.perform(post("/applications?jobId=" + allocationJobId)
                            .header("Authorization", "Bearer " + tokens[i]))
                    .andExpect(status().isOk())
                    .andReturn().getResponse().getContentAsString();
            applicationIds[i] = objectMapper.readTree(response).path("applicationId").asLong();
        }

        mockMvc.perform(get("/applications/job/" + allocationJobId)
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(jsonPath("$[2].workerLocation").value("Vijayawada"))
                .andExpect(jsonPath("$[2].workerExpectedWagePerDay").value(900.0));

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(put("/applications/" + applicationIds[i] + "/status?status=ACCEPTED")
                            .header("Authorization", "Bearer " + contractorToken))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value("ACCEPTED"));
        }
        mockMvc.perform(put("/applications/" + applicationIds[2] + "/status?status=REJECTED")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        org.junit.jupiter.api.Assertions.assertEquals(1,
                3 - applicationRepository.countByJobIdAndStatus(allocationJobId, "ACCEPTED"));
        mockMvc.perform(put("/applications/" + applicationIds[3] + "/status?status=ACCEPTED")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        mockMvc.perform(put("/applications/" + applicationIds[4] + "/status?status=ACCEPTED")
                        .header("Authorization", "Bearer " + contractorToken))
                .andExpect(status().isConflict());

        org.junit.jupiter.api.Assertions.assertEquals(3,
                applicationRepository.countByJobIdAndStatus(allocationJobId, "ACCEPTED"));
        mockMvc.perform(get("/applications/my").header("Authorization", "Bearer " + worker3Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("REJECTED"));
        mockMvc.perform(get("/applications/my").header("Authorization", "Bearer " + worker4Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("ACCEPTED"));
        mockMvc.perform(get("/applications/my").header("Authorization", "Bearer " + worker5Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].status").value("PENDING"));
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
                    org.junit.jupiter.api.Assertions.assertEquals(403, s);
                });
    }
}
