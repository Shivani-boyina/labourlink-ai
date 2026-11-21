package com.labourlink.labourlinkai.application;

import com.labourlink.labourlinkai.controller.ApplicationController;
import com.labourlink.labourlinkai.controller.AllocationController;
import com.labourlink.labourlinkai.controller.ContractorController;
import com.labourlink.labourlinkai.controller.JobController;
import com.labourlink.labourlinkai.controller.WorkerController;
import com.labourlink.labourlinkai.dto.ArchivedApplicationDTO;
import com.labourlink.labourlinkai.dto.JobRecommendationsDTO;
import com.labourlink.labourlinkai.dto.JobRecommendationsDTO.Reason;
import com.labourlink.labourlinkai.entity.Contractor;
import com.labourlink.labourlinkai.entity.Job;
import java.util.Optional;
import com.labourlink.labourlinkai.repository.ContractorRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.security.JwtFilter;
import com.labourlink.labourlinkai.security.JwtUtil;
import com.labourlink.labourlinkai.security.SecurityConfig;
import com.labourlink.labourlinkai.replacement.ReplacementController;
import com.labourlink.labourlinkai.replacement.ReplacementService;
import com.labourlink.labourlinkai.review.ReviewReadRepository;
import com.labourlink.labourlinkai.review.WorkerReviewController;
import com.labourlink.labourlinkai.review.WorkerReviewService;
import com.labourlink.labourlinkai.service.ApplicationService;
import com.labourlink.labourlinkai.service.AllocationService;
import com.labourlink.labourlinkai.service.ContractorService;
import com.labourlink.labourlinkai.service.HiringHistoryService;
import com.labourlink.labourlinkai.service.JobService;
import com.labourlink.labourlinkai.service.WorkerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// MVC slice only. All services and repositories are mocks and no datasource is configured.
@WebMvcTest(controllers = {ApplicationController.class, AllocationController.class, ContractorController.class,
        WorkerController.class, JobController.class, ReplacementController.class, WorkerReviewController.class},
        excludeAutoConfiguration = UserDetailsServiceAutoConfiguration.class)
@Import({SecurityConfig.class, JwtFilter.class})
class BatchOneWebTest {
    @Autowired MockMvc mvc;
    @MockBean JwtUtil jwt;
    @MockBean ApplicationService applications;
    @MockBean AllocationService allocations;
    @MockBean ReplacementService replacements;
    @MockBean ReviewReadRepository reviewReads;
    @MockBean WorkerReviewService reviews;
    @MockBean HiringHistoryService history;
    @MockBean ContractorService contractors;
    @MockBean WorkerService workers;
    @MockBean JobService jobs;
    @MockBean ContractorRepository contractorRepository;
    @MockBean JobRepository jobRepository;

    @BeforeEach
    void identities() {
        allowToken("worker", "worker-phone", "WORKER");
        allowToken("contractor", "contractor-phone", "CONTRACTOR");
    }

    @Test
    void archivesUseAuthenticatedWorkerAndPreserveUnknownStatus() throws Exception {
        when(history.workerArchive("worker-phone")).thenReturn(List.of(new ArchivedApplicationDTO(11L, 1L, "Archived job", null, null)));
        mvc.perform(get("/applications/history/archived?workerId=999").header("Authorization", "Bearer worker"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].applicationId").value(11))
                .andExpect(jsonPath("$[0].status").isEmpty()).andExpect(jsonPath("$[0].applicationDate").isEmpty());
        verify(history).workerArchive("worker-phone");
    }

    @Test
    void historyRoutesEnforceSeparateRoles() throws Exception {
        mvc.perform(get("/applications/history/archived")).andExpect(status().isUnauthorized());
        mvc.perform(get("/applications/history/archived").header("Authorization", "Bearer contractor"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/applications/history/contractor").header("Authorization", "Bearer worker"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(history);
        mvc.perform(get("/applications/history/contractor?contractorId=999").header("Authorization", "Bearer contractor"))
                .andExpect(status().isOk());
        verify(history).contractorSelections("contractor-phone");
    }

    @Test
    void rejectsInvalidWorkerProfileBeforeSaving() throws Exception {
        mvc.perform(put("/workers/me/matching-profile").header("Authorization", "Bearer worker")
                .contentType(MediaType.APPLICATION_JSON).content("{\"expectedWagePerDay\":-5}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.expectedWagePerDay").exists());
        verifyNoInteractions(workers);
    }

    @Test
    void rejectsOversizedJobCategoryBeforeSaving() throws Exception {
        mvc.perform(post("/jobs").header("Authorization", "Bearer contractor").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Job\",\"requiredSkill\":\"Mason\",\"location\":\"Town\","
                        + "\"wagePerDay\":500,\"requiredWorkers\":1,\"category\":\"" + "a".repeat(101) + "\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.category").exists());
        verifyNoInteractions(jobs);
    }

    @Test
    void contractorRegionRejectsWorkerRole() throws Exception {
        mvc.perform(put("/contractors/me/region").header("Authorization", "Bearer worker")
                .contentType(MediaType.APPLICATION_JSON).content("{\"state\":\"Telangana\"}"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(contractors);
    }

    @Test
    void attendanceMutationRequiresContractorRoleAndValidStatus() throws Exception {
        String endpoint = "/allocations/contractor/10/attendance/2026-11-01";
        mvc.perform(put(endpoint).header("Authorization", "Bearer worker")
                .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"PRESENT\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put(endpoint).header("Authorization", "Bearer contractor")
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(allocations);
    }

    @Test
    void jobRejectsIncompleteDateRange() throws Exception {
        mvc.perform(post("/jobs").header("Authorization", "Bearer contractor").contentType(MediaType.APPLICATION_JSON)
                .content("{\"title\":\"Job\",\"requiredSkill\":\"Mason\",\"location\":\"Town\","
                        + "\"wagePerDay\":500,\"requiredWorkers\":1,\"startDate\":\"2026-11-01\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.data.scheduleValid").exists());
        verifyNoInteractions(jobs);
    }

    @Test
    void recommendationsUseJwtIdentityAndDistinguishEmptyFromErrors() throws Exception {
        String endpoint = "/jobs/recommendations/me";
        mvc.perform(get(endpoint).param("details", "true")).andExpect(status().isUnauthorized());
        mvc.perform(get(endpoint).param("details", "true").header("Authorization", "Bearer contractor"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(jobs);

        when(jobs.findRecommendationDetails("worker-phone"))
                .thenReturn(new JobRecommendationsDTO(List.of(), List.of(Reason.LOCATION)));
        mvc.perform(get(endpoint).param("details", "true").param("workerId", "999")
                .header("Authorization", "Bearer worker"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.recommendations").isEmpty())
                .andExpect(jsonPath("$.exclusions[0]").value("LOCATION"));
        verify(jobs).findRecommendationDetails("worker-phone");

        allowToken("another-worker", "separate-phone", "WORKER");
        when(jobs.findRecommendationDetails("separate-phone")).thenThrow(new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "Worker not found"));
        mvc.perform(get(endpoint).param("details", "true").header("Authorization", "Bearer another-worker"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.recommendations").doesNotExist());
        verify(jobs).findRecommendationDetails("separate-phone");

        when(jobs.findRecommendedJobs("worker-phone")).thenReturn(List.of());
        mvc.perform(get(endpoint).header("Authorization", "Bearer worker"))
                .andExpect(status().isOk()).andExpect(jsonPath("$").isArray());
    }

    @Test
    void workerRecommendationInfrastructureErrorsAreNotValidationErrors() throws Exception {
        String endpoint = "/jobs/recommendations/me";
        when(jobs.findRecommendationDetails("worker-phone"))
                .thenThrow(new org.springframework.dao.InvalidDataAccessResourceUsageException("private SQL detail"))
                .thenThrow(new org.springframework.dao.DataAccessResourceFailureException("private connection detail"));

        mvc.perform(get(endpoint).param("details", "true").header("Authorization", "Bearer worker"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Recommendations could not be loaded"));
        mvc.perform(get(endpoint).param("details", "true").header("Authorization", "Bearer worker"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("Recommendations could not be loaded"));
    }

    @Test
    void matchingWorkersAreAvailableOnlyToTheJobsContractor() throws Exception {
        String endpoint = "/jobs/9/matches";
        mvc.perform(get(endpoint).header("Authorization", "Bearer worker")).andExpect(status().isForbidden());
        var contractor = new Contractor();
        contractor.setContractorId(4L);
        when(contractorRepository.findByPhone("contractor-phone")).thenReturn(Optional.of(contractor));
        var job = new Job();
        job.setContractorId(8L);
        when(jobs.getJobById(9L)).thenReturn(job);
        mvc.perform(get(endpoint).header("Authorization", "Bearer contractor")).andExpect(status().isForbidden());
        job.setContractorId(4L);
        mvc.perform(get(endpoint).header("Authorization", "Bearer contractor")).andExpect(status().isOk());
        verify(jobs).findMatchingWorkers(9L, true);
    }

    private void allowToken(String token, String phone, String role) {
        when(jwt.validateToken(token)).thenReturn(true);
        when(jwt.extractUsername(token)).thenReturn(phone);
        when(jwt.extractRole(token)).thenReturn(role);
    }

    @Test
    void replacementRoutesEnforceRolesBeforeCallingService() throws Exception {
        mvc.perform(get("/replacements/worker/offers")).andExpect(status().isUnauthorized());
        mvc.perform(get("/replacements/worker/offers").header("Authorization", "Bearer contractor"))
                .andExpect(status().isForbidden());
        mvc.perform(get("/replacements/contractor/requests").header("Authorization", "Bearer worker"))
                .andExpect(status().isForbidden());
        verifyNoInteractions(replacements);

        mvc.perform(get("/replacements/worker/offers?workerId=999").header("Authorization", "Bearer worker"))
                .andExpect(status().isOk());
        verify(replacements).workerOffers("worker-phone");
    }

    @Test
    void reviewEndpointRejectsWrongRoleAndInvalidRating() throws Exception {
        String endpoint = "/reviews/contractor/jobs/5/workers/2";
        mvc.perform(post(endpoint).header("Authorization", "Bearer worker")
                .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":5}"))
                .andExpect(status().isForbidden());
        mvc.perform(post(endpoint).header("Authorization", "Bearer contractor")
                .contentType(MediaType.APPLICATION_JSON).content("{\"rating\":6}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(reviews);
    }
}
