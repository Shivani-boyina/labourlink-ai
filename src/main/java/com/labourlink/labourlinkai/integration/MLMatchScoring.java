package com.labourlink.labourlinkai.integration;

import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.converter.HttpMessageConversionException;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MLMatchScoring {
    private static final Logger LOG = LoggerFactory.getLogger(MLMatchScoring.class);
    private static final String MODEL_NAME = "Logistic Regression";
    private static final String MODEL_SHA256 = "EA57FF5513A99263ABC182725E67B889E7C72266F6B255F33B3169C14F1995D0";
    private static final Duration PREDICTION_TTL = Duration.ofMinutes(5);
    private static final Duration CONTRACT_TTL = Duration.ofMinutes(5);
    private static final Duration RETRY_DELAY = Duration.ofSeconds(15);
    private static final int MAX_CACHE_ENTRIES = 1024;
    private static final int MAX_CALLS_PER_REQUEST = 8;

    public record Result(String method, Double matchPercentage, String fallbackReason, List<MLFeatureMapper.Issue> featureIssues) {
        public static Result rules(String reason, List<MLFeatureMapper.Issue> issues) {
            return new Result("RULE_BASED", null, reason, issues);
        }
    }

    private record Contract(Map<String, List<String>> categories, boolean nullableRating, Instant expiresAt) {}
    private record Cached(double percentage, Instant expiresAt) {}

    private final MLPredictionClient client;
    private final Map<Map<String, Object>, Cached> predictions = new LinkedHashMap<>(16, 0.75f, true);
    private volatile Contract contract;
    private volatile Instant retryAt = Instant.MIN;

    public MLMatchScoring(MLPredictionClient client) { this.client = client; }

    public Batch batch() { return new Batch(); }

    /** Analytics uses bounded vectorized calls, with the same feature and model contract checks. */
    public List<Result> scoreAll(List<MLFeatureMapper.Input> inputs) {
        if (inputs.size() > 256) throw new IllegalArgumentException("Maximum batch size is 256");
        Contract active = getContract();
        List<Result> results = new java.util.ArrayList<>();
        List<Map<String, Object>> valid = new java.util.ArrayList<>();
        List<Integer> positions = new java.util.ArrayList<>();
        for (var input : inputs) {
            var encoded = active == null ? input : input.encode(active.categories, active.nullableRating);
            results.add(Result.rules(active == null ? "MODEL_UNAVAILABLE" : "FEATURES_UNAVAILABLE", encoded.issues()));
            if (active != null && encoded.issues().isEmpty()) {
                positions.add(results.size() - 1);
                valid.add(encoded.values());
            }
        }
        if (valid.isEmpty()) return results;
        try {
            var payload = client.predictBatch(valid);
            if (payload == null || payload.size() != valid.size()) throw new IllegalArgumentException("Batch length mismatch");
            var scores = payload.stream().map(MLMatchScoring::validatePrediction).toList();
            for (int i = 0; i < positions.size(); i++) {
                results.set(positions.get(i), new Result("ML", scores.get(i), null, List.of()));
            }
        } catch (RestClientException | HttpMessageConversionException | IllegalArgumentException e) {
            for (int position : positions) results.set(position, Result.rules("BATCH_PREDICTION_FAILED", List.of()));
        }
        return results;
    }

    public final class Batch {
        private int calls;

        public Result score(MLFeatureMapper.Input input) {
            if (!input.issues().isEmpty()) return Result.rules("FEATURES_UNAVAILABLE", input.issues());
            Contract active = getContract();
            if (active == null) return Result.rules("MODEL_UNAVAILABLE", List.of());
            var encoded = input.encode(active.categories, active.nullableRating);
            if (!encoded.issues().isEmpty()) return Result.rules("FEATURES_UNAVAILABLE", encoded.issues());
            Double cached = cachedScore(encoded.values());
            if (cached != null) return new Result("ML", cached, null, List.of());
            if (calls >= MAX_CALLS_PER_REQUEST) return Result.rules("SCORING_LIMIT", List.of());
            if (Instant.now().isBefore(retryAt)) return Result.rules("MODEL_UNAVAILABLE", List.of());

            calls++;
            try {
                double percentage = validatePrediction(client.predict(encoded.values()));
                remember(encoded.values(), percentage);
                return new Result("ML", percentage, null, List.of());
            } catch (RestClientException | HttpMessageConversionException | IllegalArgumentException e) {
                retryAt = Instant.now().plus(RETRY_DELAY);
                LOG.warn("ML recommendation fallback: operation=predict exception={}", e.getClass().getSimpleName());
                return Result.rules("MODEL_UNAVAILABLE", List.of());
            }
        }
    }

    private Contract getContract() {
        Instant now = Instant.now();
        Contract active = contract;
        if (active != null && now.isBefore(active.expiresAt)) return active;
        if (now.isBefore(retryAt)) return null;
        synchronized (this) {
            now = Instant.now();
            active = contract;
            if (active != null && now.isBefore(active.expiresAt)) return active;
            if (now.isBefore(retryAt)) return null;
            try {
                contract = validateContract(client.featureContract());
                return contract;
            } catch (RestClientException | HttpMessageConversionException | IllegalArgumentException e) {
                retryAt = Instant.now().plus(RETRY_DELAY);
                LOG.warn("ML recommendation fallback: operation=featureContract exception={}", e.getClass().getSimpleName());
                return null;
            }
        }
    }

    private static Contract validateContract(Map<String, Object> payload) {
        if (payload == null || !MODEL_NAME.equals(payload.get("model"))
                || !(payload.get("model_sha256") instanceof String hash) || !MODEL_SHA256.equalsIgnoreCase(hash)
                || !MLFeatureMapper.FEATURES.equals(payload.get("features"))
                || !(payload.get("categories") instanceof Map<?, ?> categories)
                || !categories.keySet().equals(MLFeatureMapper.CATEGORIES)
                || !(payload.get("nullable_worker_rating") instanceof Boolean nullable)) {
            throw new IllegalArgumentException("Incompatible model contract");
        }
        Map<String, List<String>> checked = new LinkedHashMap<>();
        for (String name : MLFeatureMapper.CATEGORIES) {
            if (!(categories.get(name) instanceof List<?> list) || list.isEmpty()
                    || list.stream().anyMatch(value -> !(value instanceof String s) || s.isBlank())) {
                throw new IllegalArgumentException("Invalid category vocabulary");
            }
            checked.put(name, list.stream().map(String.class::cast).toList());
        }
        if (!checked.get("allocated_this_month").containsAll(List.of("yes", "no"))) {
            throw new IllegalArgumentException("Invalid monthly allocation encoding");
        }
        return new Contract(Map.copyOf(checked), nullable, Instant.now().plus(CONTRACT_TTL));
    }

    static double validatePrediction(Map<String, Object> payload) {
        if (payload == null || !MODEL_NAME.equals(payload.get("model"))) {
            throw new IllegalArgumentException("Invalid prediction model");
        }
        double label = number(payload.get("prediction"));
        double probability = number(payload.get("match_probability"));
        double percentage = number(payload.get("match_percentage"));
        if ((label != 0 && label != 1) || probability < 0 || probability > 1 || percentage < 0 || percentage > 100
                || Math.abs(percentage - probability * 100) > 0.011) {
            throw new IllegalArgumentException("Invalid prediction values");
        }
        return percentage;
    }

    private static double number(Object value) {
        if (!(value instanceof Number n) || !Double.isFinite(n.doubleValue())) {
            throw new IllegalArgumentException("Expected a finite prediction number");
        }
        return n.doubleValue();
    }

    private Double cachedScore(Map<String, Object> features) {
        synchronized (predictions) {
            Cached item = predictions.get(features);
            return item != null && Instant.now().isBefore(item.expiresAt) ? item.percentage : null;
        }
    }

    private void remember(Map<String, Object> features, double percentage) {
        synchronized (predictions) {
            predictions.put(features, new Cached(percentage, Instant.now().plus(PREDICTION_TTL)));
            if (predictions.size() > MAX_CACHE_ENTRIES) {
                predictions.remove(predictions.keySet().iterator().next());
            }
        }
    }
}
