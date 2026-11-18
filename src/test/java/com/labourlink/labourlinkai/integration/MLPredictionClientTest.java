package com.labourlink.labourlinkai.integration;

import static org.junit.jupiter.api.Assertions.*;

import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.web.client.RestClient;

@EnabledIfEnvironmentVariable(named = "LABOURLINK_ML_TEST_URL", matches = "http://127[.]0[.]0[.]1:[0-9]{1,5}")
class MLPredictionClientTest {

    private MLPredictionClient createClient() {
        return new MLPredictionClient(
                RestClient.builder(),
                System.getenv("LABOURLINK_ML_TEST_URL")
        );
    }

    @Test
    void shouldConnectToFastAPI() {
        Map<String, Object> response = createClient().checkHealth();

        assertNotNull(response);
        assertEquals("healthy", response.get("status"));
        assertEquals(true, response.get("model_loaded"));
        assertEquals(16, response.get("features_count"));

        System.out.println("SUCCESS: Java connected to FastAPI!");
    }

    @Test
    void shouldPredictUsingOriginalModel() {

        Map<String, Object> features = new LinkedHashMap<>();

        features.put("worker_category", "skilled");
        features.put("worker_location", "Mahabubnagar");
        features.put("worker_state", "Telangana");
        features.put("worker_district", "Mahabubnagar");
        features.put("experience_years", 2);
        features.put("worker_rating", 4.4);
        features.put("worker_review_count", 1);
        features.put("allocated_this_month", "no");
        features.put("jobs_allocated_this_month", 0);
        features.put("expected_daily_wage", 675.0);
        features.put("job_category", "Plumbing");
        features.put("job_location", "Suryapet");
        features.put("job_state", "Telangana");
        features.put("job_district", "Suryapet");
        features.put("offered_daily_wage", 676.0);
        features.put("job_duration_days", 15);

        Map<String, Object> result = createClient().predict(features);

        assertNotNull(result);
        assertTrue(result.containsKey("prediction"));
        assertTrue(result.containsKey("match_probability"));
        assertTrue(result.containsKey("match_percentage"));

        int prediction = ((Number) result.get("prediction")).intValue();
        double probability =
                ((Number) result.get("match_probability")).doubleValue();

        assertTrue(prediction == 0 || prediction == 1);
        assertTrue(probability >= 0.0 && probability <= 1.0);

        System.out.println("SUCCESS: Java received a real ML prediction!");
        System.out.println("Prediction result: " + result);
    }

    @Test
    void scoresVerifiedNullableRatingThroughTheApplicationClient() {
        var input = MLMatchingTest.complete(0,
                com.labourlink.labourlinkai.review.ReviewReadRepository.Rating.UNRATED,
                java.util.OptionalLong.of(0));
        var result = new MLMatchScoring(createClient()).batch().score(input);
        assertEquals("ML", result.method());
        assertNotNull(result.matchPercentage());
        assertTrue(result.matchPercentage() >= 0 && result.matchPercentage() <= 100);
        System.out.println("Original model through validated client, zero reviews and null rating: " + result.matchPercentage() + "%");
    }
}
