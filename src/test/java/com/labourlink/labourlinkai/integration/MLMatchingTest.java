package com.labourlink.labourlinkai.integration;

import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.review.ReviewReadRepository.Rating;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.net.InetSocketAddress;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.*;

class MLMatchingTest {
    @Test
    void analyticsBatchPreservesAlignmentAndRejectsMalformedScores() {
        var client = mock(MLPredictionClient.class);
        when(client.featureContract()).thenReturn(contract());
        when(client.predictBatch(anyList())).thenReturn(List.of(validPrediction(.8, 80)));
        var scorer = new MLMatchScoring(client);
        var valid = complete(2, Rating.UNRATED, OptionalLong.of(0));
        var invalid = new MLFeatureMapper.Input(Map.of(), List.of(new MLFeatureMapper.Issue("worker_category", "MISSING")));
        var results = scorer.scoreAll(List.of(invalid, valid));
        assertThat(results.get(0).method()).isEqualTo("RULE_BASED");
        assertThat(results.get(1).matchPercentage()).isEqualTo(80);
        verify(client).predictBatch(argThat(values -> values.size() == 1));
        when(client.predictBatch(anyList())).thenReturn(List.of(validPrediction(.8, 90)));
        assertThat(scorer.scoreAll(List.of(valid)).get(0).fallbackReason()).isEqualTo("BATCH_PREDICTION_FAILED");
        assertThatThrownBy(() -> scorer.scoreAll(java.util.Collections.nCopies(257, valid))).isInstanceOf(IllegalArgumentException.class);
    }
    private static final String ORIGINAL_HASH = "EA57FF5513A99263ABC182725E67B889E7C72266F6B255F33B3169C14F1995D0";

    @Test
    void mapsAllSixteenGenuineValuesAndCanonicalizesCategories() {
        var input = complete(0, Rating.UNRATED, OptionalLong.of(0));
        assertThat(input.issues()).isEmpty();
        assertThat(new ArrayList<>(input.values().keySet())).containsExactlyElementsOf(MLFeatureMapper.FEATURES);
        var encoded = input.encode(vocabulary(), true);
        assertThat(encoded.issues()).isEmpty();
        assertThat(encoded.values()).containsEntry("worker_category", "skilled")
                .containsEntry("worker_location", "Hyderabad")
                .containsEntry("worker_state", "Telangana")
                .containsEntry("worker_district", "Hyderabad")
                .containsEntry("experience_years", 0)
                .containsEntry("worker_rating", null)
                .containsEntry("worker_review_count", 0)
                .containsEntry("allocated_this_month", "no")
                .containsEntry("jobs_allocated_this_month", 0)
                .containsEntry("expected_daily_wage", 0.0)
                .containsEntry("job_category", "Masonry")
                .containsEntry("job_location", "Hyderabad")
                .containsEntry("job_state", "Telangana")
                .containsEntry("job_district", "Hyderabad")
                .containsEntry("offered_daily_wage", 700.0)
                .containsEntry("job_duration_days", 10);

        var allocated = complete(4, new Rating(4.25, 2), OptionalLong.of(3));
        assertThat(allocated.values()).containsEntry("worker_rating", 4.25)
                .containsEntry("worker_review_count", 2).containsEntry("allocated_this_month", "yes")
                .containsEntry("jobs_allocated_this_month", 3);
        assertThat(input.encode(vocabulary(), false).issues()).contains(new MLFeatureMapper.Issue("worker_rating", "MISSING"));
    }

    @Test
    void incompleteAndUnsupportedValuesNeverReachPrediction() {
        var client = mock(MLPredictionClient.class);
        var scorer = new MLMatchScoring(client);
        Worker worker = worker(null);
        worker.setExpectedWagePerDay(null);
        var input = MLFeatureMapper.from(worker, new Job(), new Rating(null, 1), OptionalLong.empty());
        assertThat(scorer.batch().score(input).featureIssues())
                .contains(new MLFeatureMapper.Issue("experience_years", "MISSING"),
                          new MLFeatureMapper.Issue("expected_daily_wage", "MISSING"),
                          new MLFeatureMapper.Issue("job_category", "MISSING"),
                          new MLFeatureMapper.Issue("worker_rating", "MISSING"),
                          new MLFeatureMapper.Issue("allocated_this_month", "HISTORY_UNKNOWN"),
                          new MLFeatureMapper.Issue("jobs_allocated_this_month", "HISTORY_UNKNOWN"));
        verifyNoInteractions(client);

        worker = worker(5);
        worker.setCategory("Generic Labour");
        when(client.featureContract()).thenReturn(contract());
        var unknown = scorer.batch().score(MLFeatureMapper.from(worker, job(), Rating.UNRATED, OptionalLong.of(0)));
        assertThat(unknown.matchPercentage()).isNull();
        assertThat(unknown.featureIssues()).containsExactly(new MLFeatureMapper.Issue("worker_category", "UNSUPPORTED"));
        verify(client, never()).predict(anyMap());
    }

    @Test
    void cachesStableFeaturesAndRescoresChangedReviewEvidence() {
        var client = mock(MLPredictionClient.class);
        when(client.featureContract()).thenReturn(contract());
        when(client.predict(anyMap())).thenReturn(validPrediction(0.63, 63.0), validPrediction(0.42, 42.0));
        var scorer = new MLMatchScoring(client);
        var first = complete(3, new Rating(5.0, 1), OptionalLong.of(1));
        assertThat(scorer.batch().score(first).matchPercentage()).isEqualTo(63.0);
        assertThat(scorer.batch().score(first).matchPercentage()).isEqualTo(63.0);
        assertThat(scorer.batch().score(complete(3, Rating.UNRATED, OptionalLong.of(1))).matchPercentage()).isEqualTo(42.0);
        verify(client).featureContract();
        verify(client, times(2)).predict(anyMap());
    }

    @Test
    void malformedResponsesAndUnavailableServiceFallBackWithoutScores() {
        var malformed = mock(MLPredictionClient.class);
        when(malformed.featureContract()).thenReturn(contract());
        when(malformed.predict(anyMap())).thenReturn(validPrediction(0.8, 99));
        var input = complete(1, Rating.UNRATED, OptionalLong.of(0));
        var scorer = new MLMatchScoring(malformed);
        assertThat(scorer.batch().score(input)).isEqualTo(MLMatchScoring.Result.rules("MODEL_UNAVAILABLE", List.of()));
        scorer.batch().score(input);
        verify(malformed).predict(anyMap());

        var unavailable = mock(MLPredictionClient.class);
        when(unavailable.featureContract()).thenThrow(new ResourceAccessException("Connection refused"));
        assertThat(new MLMatchScoring(unavailable).batch().score(input).fallbackReason()).isEqualTo("MODEL_UNAVAILABLE");
        verify(unavailable, never()).predict(anyMap());
    }

    @Test
    void actualHttpTimeoutFallsBack() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var receivedPrediction = new AtomicBoolean();
        var safetyDeadline = new AtomicBoolean();
        var releaseResponse = new CountDownLatch(1);
        server.createContext("/feature-contract", exchange -> {
            try {
                byte[] body = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsBytes(contract());
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body);
            } finally {
                exchange.close();
            }
        });
        server.createContext("/predict", exchange -> {
            try {
                receivedPrediction.set(true);
                safetyDeadline.set(!releaseResponse.await(8, TimeUnit.SECONDS));
                exchange.sendResponseHeaders(504, -1);
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            } finally {
                exchange.close();
            }
        });
        server.start();
        try {
            var client = new MLPredictionClient(RestClient.builder(), "http://127.0.0.1:" + server.getAddress().getPort());
            var result = new MLMatchScoring(client).batch().score(complete(2, Rating.UNRATED, OptionalLong.of(0)));
            assertThat(result).isEqualTo(MLMatchScoring.Result.rules("MODEL_UNAVAILABLE", List.of()));
            assertThat(receivedPrediction).isTrue();
            assertThat(safetyDeadline).isFalse();
        } finally {
            releaseResponse.countDown();
            server.stop(0);
        }
    }

    static MLFeatureMapper.Input complete(int experience, Rating rating, OptionalLong month) {
        return MLFeatureMapper.from(worker(experience), job(), rating, month);
    }

    private static Worker worker(Integer experience) {
        var worker = new Worker(1L, "Fixture worker", "", null, "Mason", experience, " hyderabad ", true);
        worker.setCategory("SKILLED");
        worker.setState("telangana");
        worker.setDistrict("Hyderabad");
        worker.setExpectedWagePerDay(0.0);
        return worker;
    }

    private static Job job() {
        var job = new Job(2L, "Fixture job", "", "Mason", "Hyderabad", 700.0, 1, "OPEN", 1L);
        job.setCategory("Masonry");
        job.setState("Telangana");
        job.setDistrict("Hyderabad");
        job.setDurationDays(10);
        return job;
    }

    private static Map<String, Object> validPrediction(double probability, double percentage) {
        return Map.of("model", "Logistic Regression", "prediction", probability >= 0.5 ? 1 : 0,
                "match_probability", probability, "match_percentage", percentage);
    }

    private static Map<String, Object> contract() {
        return Map.of("model", "Logistic Regression", "model_sha256", ORIGINAL_HASH,
                "features", MLFeatureMapper.FEATURES, "categories", vocabulary(), "nullable_worker_rating", true);
    }

    private static Map<String, List<String>> vocabulary() {
        var values = new LinkedHashMap<String, List<String>>();
        for (String field : MLFeatureMapper.CATEGORIES) {
            values.put(field, switch (field) {
                case "worker_category" -> List.of("entry-level", "semi-skilled", "skilled");
                case "job_category" -> List.of("Masonry");
                case "job_state", "worker_state" -> List.of("Andhra Pradesh", "Telangana");
                case "allocated_this_month" -> List.of("yes", "no");
                default -> List.of("Hyderabad");
            });
        }
        return values;
    }
}
