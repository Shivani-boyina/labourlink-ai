package com.labourlink.labourlinkai.integration;

import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.Worker;
import com.labourlink.labourlinkai.review.ReviewReadRepository.Rating;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;
import java.util.Set;

public final class MLFeatureMapper {
    private MLFeatureMapper() {}

    public static final List<String> FEATURES = List.of(
            "worker_category", "worker_location", "worker_state", "worker_district",
            "experience_years", "worker_rating", "worker_review_count", "allocated_this_month",
            "jobs_allocated_this_month", "expected_daily_wage", "job_category", "job_location",
            "job_state", "job_district", "offered_daily_wage", "job_duration_days");
    public static final Set<String> CATEGORIES = Set.of(
            "worker_category", "worker_location", "worker_state", "worker_district", "allocated_this_month",
            "job_category", "job_location", "job_state", "job_district");

    public record Issue(String feature, String reason) {}
    public record Input(Map<String, Object> values, List<Issue> issues) {
        public Input {
            values = Collections.unmodifiableMap(new LinkedHashMap<>(values));
            issues = List.copyOf(issues);
        }

        public Input encode(Map<String, List<String>> categories, boolean nullableRating) {
            Map<String, Object> encoded = new LinkedHashMap<>(values);
            List<Issue> problems = new ArrayList<>(issues);
            if (encoded.containsKey("worker_rating") && encoded.get("worker_rating") == null && !nullableRating) {
                problems.add(new Issue("worker_rating", "MISSING"));
            }
            for (String feature : FEATURES) {
                if (!CATEGORIES.contains(feature) || !encoded.containsKey(feature)) continue;
                String actual = (String) encoded.get(feature);
                var matches = categories.getOrDefault(feature, List.of()).stream()
                        .filter(value -> value.equalsIgnoreCase(actual)).toList();
                if (matches.size() == 1) encoded.put(feature, matches.get(0));
                else problems.add(new Issue(feature, "UNSUPPORTED"));
            }
            return new Input(encoded, problems);
        }
    }

    public static Input from(Worker worker, Job job, Rating rating, OptionalLong month) {
        Builder input = new Builder();
        input.text("worker_category", worker.getCategory());
        input.text("worker_location", worker.getLocation());
        input.text("worker_state", worker.getState());
        input.text("worker_district", worker.getDistrict());
        input.number("experience_years", worker.getExperience(), 0, Integer.MAX_VALUE);

        if (rating.reviewCount() == 0 && rating.averageRating() == null) input.values.put("worker_rating", null);
        else if (rating.reviewCount() <= 0) input.issues.add(new Issue("worker_rating", "UNSUPPORTED"));
        else input.number("worker_rating", rating.averageRating(), 1, 5);
        input.number("worker_review_count", rating.reviewCount(), 0, Integer.MAX_VALUE);
        if (month.isPresent() && month.getAsLong() >= 0 && month.getAsLong() <= Integer.MAX_VALUE) {
            input.values.put("allocated_this_month", month.getAsLong() == 0 ? "no" : "yes");
            input.values.put("jobs_allocated_this_month", (int) month.getAsLong());
        } else {
            String reason = month.isEmpty() ? "HISTORY_UNKNOWN" : "UNSUPPORTED";
            input.issues.add(new Issue("allocated_this_month", reason));
            input.issues.add(new Issue("jobs_allocated_this_month", reason));
        }
        input.number("expected_daily_wage", worker.getExpectedWagePerDay(), 0, Double.MAX_VALUE);
        input.text("job_category", job.getCategory());
        input.text("job_location", job.getLocation());
        input.text("job_state", job.getState());
        input.text("job_district", job.getDistrict());
        input.number("offered_daily_wage", job.getWagePerDay(), 1, Double.MAX_VALUE);
        input.number("job_duration_days", job.getDurationDays(), 1, Integer.MAX_VALUE);
        return new Input(input.values, input.issues);
    }

    private static final class Builder {
        final Map<String, Object> values = new LinkedHashMap<>();
        final List<Issue> issues = new ArrayList<>();

        void text(String name, String value) {
            if (value == null || value.isBlank()) issues.add(new Issue(name, "MISSING"));
            else values.put(name, value.strip());
        }

        void number(String name, Number value, double minimum, double maximum) {
            if (value == null) issues.add(new Issue(name, "MISSING"));
            else if (!Double.isFinite(value.doubleValue()) || value.doubleValue() < minimum || value.doubleValue() > maximum) {
                issues.add(new Issue(name, "UNSUPPORTED"));
            } else values.put(name, value instanceof Long ? value.intValue() : value);
        }
    }
}
