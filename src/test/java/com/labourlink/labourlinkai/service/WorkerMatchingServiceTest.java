package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.dto.JobRecommendationsDTO.Reason;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.integration.MLFeatureMapper;
import com.labourlink.labourlinkai.integration.MLMatchScoring;
import com.labourlink.labourlinkai.integration.MLPredictionClient;
import com.labourlink.labourlinkai.repository.MatchingDataRepository;
import com.labourlink.labourlinkai.repository.WorkerRepository;
import com.labourlink.labourlinkai.review.ReviewReadRepository;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;

import java.util.List;
import java.util.Map;
import java.util.OptionalLong;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class WorkerMatchingServiceTest {
    private final WorkerRepository workers = mock(WorkerRepository.class);
    private final MatchingDataRepository history = mock(MatchingDataRepository.class);
    private final ReviewReadRepository reviews = mock(ReviewReadRepository.class);
    private final MLPredictionClient client = mock(MLPredictionClient.class);
    private final WorkerMatchingService service = new WorkerMatchingService(
            workers, history, reviews, new MLMatchScoring(client));

    @Test
    void eligibleJobSurvivesModelDowntimeWithAnExplainableRulesScore() {
        var worker = worker();
        var job = job(" ramavara  padu ");
        when(history.monthlyAllocations(eq(List.of(7L)), any()))
                .thenReturn(new MatchingDataRepository.AllocationHistory(Map.of(), Set.of()));
        when(client.featureContract()).thenThrow(new ResourceAccessException("offline"));

        var result = service.recommend(worker, List.of(job), candidate -> true);

        assertThat(result.exclusions()).isEmpty();
        assertThat(result.recommendations()).singleElement().satisfies(row -> {
            assertThat(row.getMatchingScore()).isEqualTo(100);
            assertThat(row.getMatchingReasons()).contains("SKILL", "LOCATION", "WAGE");
            assertThat(row.getRecommendation().method()).isEqualTo("RULE_BASED");
            assertThat(row.getRecommendation().fallbackReason()).isEqualTo("MODEL_UNAVAILABLE");
        });
    }

    @Test
    void reportsRealExclusionsWithoutInvokingModelOrRelaxingEligibility() {
        var worker = worker();
        var nearby = job("Vijayawada");
        var underpaid = job(worker.getLocation());
        underpaid.setWagePerDay(400.0);
        var full = job(worker.getLocation());
        var conflicting = job(worker.getLocation());
        when(history.unavailableFor(eq(List.of(7L)), eq(conflicting), any())).thenReturn(Set.of(7L));

        var result = service.recommend(worker, List.of(nearby, underpaid, full, conflicting), job -> job != full);

        assertThat(result.recommendations()).isEmpty();
        assertThat(result.exclusions()).containsExactlyInAnyOrder(Reason.LOCATION, Reason.WAGE, Reason.NO_OPEN_SLOTS, Reason.SCHEDULE);
        verifyNoInteractions(client, reviews);
        assertThat(service.recommend(worker, List.of(), job -> true).exclusions()).containsExactly(Reason.NO_OPEN_JOBS);
    }

    @Test
    void carpentryOpeningsInOtherLocationsCannotMatchGudivada() {
        var worker = worker();
        worker.setLocation("Gudivada");
        worker.setExperience(7);
        var ramavarapadu = job("Ramavarapadu");
        ramavarapadu.setWagePerDay(400.0);
        var vijayawada = job("Vijayawada");
        vijayawada.setJobId(10L);

        var result = service.recommend(worker, List.of(ramavarapadu, vijayawada), candidate -> true);

        assertThat(result.recommendations()).isEmpty();
        assertThat(result.exclusions()).containsExactly(Reason.LOCATION);
        verifyNoInteractions(history, reviews, client);
    }

    @Test
    void normalizesKnownVocabularyAndPreservesUnrecognizedCategories() {
        var job = job(" Ramavara  Padu ");
        var vocabulary = Map.of(
                "worker_category", List.of("skilled"), "worker_location", List.of("Ramavara Padu"),
                "worker_state", List.of("Andhra Pradesh"), "worker_district", List.of("NTR"),
                "allocated_this_month", List.of("no"), "job_category", List.of("Carpentry"),
                "job_location", List.of("Ramavara Padu"), "job_state", List.of("Andhra Pradesh"),
                "job_district", List.of("NTR"));
        var input = MLFeatureMapper.from(worker(), job, ReviewReadRepository.Rating.UNRATED, OptionalLong.of(0))
                .encode(vocabulary, true);
        assertThat(input.issues()).isEmpty();
        assertThat(input.values()).containsEntry("job_category", "Carpentry")
                .containsEntry("job_location", "Ramavara Padu")
                .containsEntry("job_state", "Andhra Pradesh");
        job.setCategory("Infrastructure");
        var unsupported = MLFeatureMapper.from(worker(), job, ReviewReadRepository.Rating.UNRATED, OptionalLong.of(0))
                .encode(vocabulary, true);
        assertThat(unsupported.issues()).containsExactly(new MLFeatureMapper.Issue("job_category", "UNSUPPORTED"));
    }

    @Test
    void contractorMatchesUseSameLocationAndWageRules() {
        var job = job("Ramavara Padu");
        var eligible = worker();
        var other = worker();
        other.setWorkerId(8L);
        other.setExpectedWagePerDay(900.0);
        when(workers.findMatchingSkill("Carpenter")).thenReturn(List.of(eligible, other));
        when(history.monthlyAllocations(eq(List.of(7L)), any()))
                .thenReturn(new MatchingDataRepository.AllocationHistory(Map.of(), Set.of()));
        when(client.featureContract()).thenThrow(new ResourceAccessException("offline"));

        assertThat(service.find(job, true)).singleElement().satisfies(row -> {
            assertThat(row.getWorkerId()).isEqualTo(7L);
            assertThat(row.getSkillMatch()).isEqualTo(100);
            assertThat(row.getPhone()).isNull();
            assertThat(row.getMatchingScore()).isEqualTo(100);
            assertThat(row.getRecommendation().fallbackReason()).isEqualTo("MODEL_UNAVAILABLE");
        });
    }

    @Test
    void carpenterInVijayawadaWithZeroExperienceReceivesSortedEligibleMatches() {
        var carpenter = worker();
        carpenter.setLocation("Vijayawada");
        carpenter.setExperience(0);
        carpenter.setExpectedWagePerDay(500.0);
        var opening = job(" vijayawada ");
        opening.setMinimumExperience(0);
        var applied = job("Vijayawada");
        applied.setJobId(10L);
        applied.setMinimumExperience(0);
        var second = job("Vijayawada");
        second.setJobId(11L);
        second.setMinimumExperience(0);
        when(history.monthlyAllocations(eq(List.of(7L)), any()))
                .thenReturn(new MatchingDataRepository.AllocationHistory(Map.of(), Set.of()));
        when(client.featureContract()).thenThrow(new ResourceAccessException("offline"));

        var plumbing = job("Vijayawada");
        plumbing.setJobId(12L);
        plumbing.setRequiredSkill("Plumber");
        var result = service.recommend(carpenter, List.of(second, applied, opening, plumbing), candidate -> true, Set.of(10L));

        assertThat(result.recommendations()).extracting(row -> row.getJob().getJobId()).containsExactly(9L, 11L);
        assertThat(result.recommendations()).allSatisfy(row -> assertThat(row.getMatchingScore()).isEqualTo(100));
        assertThat(result.excludedJobs()).containsEntry(10L, Reason.ALREADY_APPLIED).containsEntry(12L, Reason.SKILL);
        assertThat(result.compatibility().get(9L).skillMatch()).isEqualTo(100);
        assertThat(result.compatibility().get(10L).skillMatch()).isEqualTo(100);
        assertThat(result.compatibility().get(12L).skillMatch()).isZero();

        carpenter.setExpectedWagePerDay(501.0);
        var underpaid = service.recommend(carpenter, List.of(opening), candidate -> true);
        assertThat(underpaid.excludedJobs()).containsEntry(9L, Reason.WAGE);
        assertThat(underpaid.compatibility().get(9L).skillMatch()).isEqualTo(100);
        assertThat(underpaid.recommendations()).isEmpty();
    }

    @Test
    void contractorFallbackMatchesUseDescendingDisplayedScore() {
        var opening = job("Ramavara Padu");
        var complete = worker();
        var missingWage = worker();
        missingWage.setWorkerId(8L);
        missingWage.setExperience(12);
        missingWage.setExpectedWagePerDay(null);
        when(workers.findMatchingSkill("Carpenter")).thenReturn(List.of(missingWage, complete));
        when(history.monthlyAllocations(eq(List.of(8L, 7L)), any()))
                .thenReturn(new MatchingDataRepository.AllocationHistory(Map.of(), Set.of()));
        when(client.featureContract()).thenThrow(new ResourceAccessException("offline"));

        assertThat(service.find(opening, true)).extracting(row -> row.getMatchingScore()).containsExactly(100, 80);
    }

    private Worker worker() {
        var worker = new Worker();
        worker.setWorkerId(7L);
        worker.setName("Fixture worker");
        worker.setSkill(" carpenter ");
        worker.setLocation("Ramavara\u00a0Padu");
        worker.setState("Andhra\u2002Pradesh");
        worker.setDistrict("NTR");
        worker.setCategory("  SKILLED ");
        worker.setAvailability(true);
        worker.setExperience(3);
        worker.setExpectedWagePerDay(500.0);
        return worker;
    }

    private Job job(String location) {
        var job = new Job(9L, "Furniture work", "", "Carpenter", location, 500.0, 2, "OPEN", 4L);
        job.setCategory(" carpentry ");
        job.setState("Andhra  Pradesh");
        job.setDistrict("NTR");
        job.setMinimumExperience(1);
        job.setDurationDays(2);
        return job;
    }
}
