package com.labourlink.labourlinkai.dto;

import java.util.List;
import java.util.Map;

public record JobRecommendationsDTO(List<JobSearchDTO> recommendations, List<Reason> exclusions,
                                    Map<Long, Reason> excludedJobs, Map<Long, Compatibility> compatibility) {
    public JobRecommendationsDTO(List<JobSearchDTO> recommendations, List<Reason> exclusions) {
        this(recommendations, exclusions, Map.of(), Map.of());
    }

    public record Compatibility(int skillMatch, int rulesScore) {}

    public enum Reason {
        UNAVAILABLE, NO_OPEN_JOBS, SKILL, EXPIRED, LOCATION, REGION, EXPERIENCE, WAGE, NO_OPEN_SLOTS, SCHEDULE, CLOSED, ALREADY_APPLIED
    }
}
