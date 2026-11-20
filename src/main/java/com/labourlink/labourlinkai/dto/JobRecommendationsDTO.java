package com.labourlink.labourlinkai.dto;

import java.util.List;

public record JobRecommendationsDTO(List<JobSearchDTO> recommendations, List<Reason> exclusions) {
    public enum Reason {
        UNAVAILABLE, NO_OPEN_JOBS, SKILL, EXPIRED, LOCATION, REGION, EXPERIENCE, WAGE, NO_OPEN_SLOTS, SCHEDULE
    }
}
