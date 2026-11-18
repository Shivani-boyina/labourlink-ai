package com.labourlink.labourlinkai.analytics;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.labourlink.labourlinkai.entity.*;
import com.labourlink.labourlinkai.repository.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class EmploymentAnalyticsTest {
    @TempDir Path temp;
    @Test void assignmentUsesDatesAndStatusWithoutCountingFutureWork() {
        LocalDate today = LocalDate.of(2026, 11, 17);
        assertThat(new EmploymentAnalyticsService.Assignment(1, 2, "ACTIVE", today, today).current(today)).isTrue();
        assertThat(new EmploymentAnalyticsService.Assignment(1, 2, "ACTIVE", today.plusDays(1), null).current(today)).isFalse();
        assertThat(new EmploymentAnalyticsService.Assignment(1, 2, "CANCELLED", null, null).current(today)).isFalse();
        assertThat(new EmploymentAnalyticsService.Assignment(1, 2, "ACTIVE", null, null).covered(today)).isFalse();
        assertThat(EmploymentAnalyticsService.rate(1, 3)).isEqualTo(33.33);
        assertThat(EmploymentAnalyticsService.rate(0, 0)).isZero();
    }
    @Test void manifestVerifiesIdentityAndDoesNotClassifyUnrelatedIdsAsDemo() throws Exception {
        var file = temp.resolve("manifest.json");
        Files.writeString(file, """
                {"source_sha256":"fixture","workers":{"WKR_1":{"id":1,"phone":"9901000001"}},"jobs":{"JOB_1":2}}
                """);
        var provenance = new DemoProvenance(new ObjectMapper(), file.toString());
        var worker = worker(1L, "Dataset Demo WKR_1"); worker.setPhone("9901000001");
        var job = new Job(2L, "Dataset Demo JOB_1 Mason", "", "Mason", "Town", 500.0, 1, "OPEN", 1L);
        assertThat(provenance.identify(List.of(worker), List.of(job)).workers()).containsExactly(1L);
        worker.setName("Actual worker");
        assertThat(provenance.identify(List.of(worker), List.of(job)).workers()).isEmpty();
    }
    @Test void demoMatchesCannotIncreaseActualEmploymentAndWorkersAreDeduplicated() {
        var workers = mock(WorkerRepository.class); var jobs = mock(JobRepository.class);
        var applications = mock(ApplicationRepository.class); var jdbc = mock(JdbcTemplate.class);
        var provenance = mock(DemoProvenance.class); var runs = mock(AnalyticsRunRepository.class);
        var people = List.of(worker(1L, "Actual"), worker(2L, "Dataset Demo WKR_2"), worker(3L, "Other"));
        var vacancies = List.of(new Job(10L, "Actual", "", "Mason", "Town", 500.0, 2, "OPEN", 1L),
                new Job(11L, "Dataset Demo JOB_2 Mason", "", "Mason", "Town", 500.0, 2, "OPEN", 1L));
        when(workers.findAll()).thenReturn(people); when(jobs.findAll()).thenReturn(vacancies);
        when(provenance.identify(people, vacancies)).thenReturn(new DemoProvenance.Cohort(Set.of(2L), Set.of(11L), "fixture", ""));
        when(applications.findAll()).thenReturn(List.of());
        when(runs.findFirstByOrderByStartedAtDesc()).thenReturn(Optional.empty());
        when(jdbc.query(anyString(), any(RowMapper.class))).thenAnswer(invocation -> {
            String sql = invocation.getArgument(0);
            if (sql.startsWith("SELECT worker_id")) return new ArrayList<>(List.of(
                    new EmploymentAnalyticsService.Assignment(1, 10, "ACTIVE", null, null),
                    new EmploymentAnalyticsService.Assignment(1, 10, "ACTIVE", null, null),
                    new EmploymentAnalyticsService.Assignment(2, 11, "ACTIVE", null, null)));
            return new ArrayList<>();
        });
        var result = new EmploymentAnalyticsService(workers, jobs, applications, jdbc, provenance, runs, new ObjectMapper()).dashboard(7);
        assertThat(result.actual().totalWorkers()).isEqualTo(2);
        assertThat(result.actual().employedWorkers()).isEqualTo(1);
        assertThat(result.actual().unemployedWorkers()).isEqualTo(1);
        assertThat(result.actual().workersWithMlRecommendations()).isNull();
        assertThat(result.demo().employedWorkers()).isEqualTo(1);
        assertThat(result.actual().averageUnemploymentDays()).isNull();
    }
    private Worker worker(Long id, String name) { return new Worker(id, name, "", null, "Mason", 2, "Town", true); }
}
