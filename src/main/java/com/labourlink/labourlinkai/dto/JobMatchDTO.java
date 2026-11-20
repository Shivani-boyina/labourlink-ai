package com.labourlink.labourlinkai.dto;

import com.labourlink.labourlinkai.integration.MLMatchScoring;
import java.util.List;

public class JobMatchDTO {

    private Long workerId;
    private String name;
    private String phone;
    private String skill;
    private Integer experience;
    private String location;
    private Boolean availability;
    private String matchReason;
    private Double averageRating;
    private long reviewCount;
    private MLMatchScoring.Result recommendation;
    private List<String> matchingReasons;
    private Integer matchingScore;

    public JobMatchDTO() {
    }

    public JobMatchDTO(
            Long workerId,
            String name,
            String phone,
            String skill,
            Integer experience,
            String location,
            Boolean availability,
            String matchReason) {

        this.workerId = workerId;
        this.name = name;
        this.phone = phone;
        this.skill = skill;
        this.experience = experience;
        this.location = location;
        this.availability = availability;
        this.matchReason = matchReason;
    }

    public Long getWorkerId() {
        return workerId;
    }

    public void setWorkerId(Long workerId) {
        this.workerId = workerId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getSkill() {
        return skill;
    }

    public void setSkill(String skill) {
        this.skill = skill;
    }

    public Integer getExperience() {
        return experience;
    }

    public void setExperience(Integer experience) {
        this.experience = experience;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Boolean getAvailability() {
        return availability;
    }

    public void setAvailability(Boolean availability) {
        this.availability = availability;
    }

    public String getMatchReason() {
        return matchReason;
    }

    public Double getAverageRating() { return averageRating; }
    public long getReviewCount() { return reviewCount; }
    public MLMatchScoring.Result getRecommendation() { return recommendation; }
    public List<String> getMatchingReasons() { return matchingReasons; }

    public Integer getMatchingScore() { return matchingScore; }
    public void setMatchingScore(Integer matchingScore) { this.matchingScore = matchingScore; }

    public void applyRecommendation(MLMatchScoring.Result result, List<String> reasons) {
        recommendation = result;
        matchingReasons = reasons;
    }

    public void applyRating(Double average, long count) {
        averageRating = average;
        reviewCount = count;
    }

    public void setMatchReason(String matchReason) {
        this.matchReason = matchReason;
    }
}
