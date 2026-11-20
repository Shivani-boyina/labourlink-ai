package com.labourlink.labourlinkai.dto;

import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.integration.MLMatchScoring;

import java.util.List;

public class JobSearchDTO {

    private Job job;
    private String contractorName;
    private List<String> matchingReasons;
    private int matchingScore;
    private MLMatchScoring.Result recommendation;

    public JobSearchDTO() {
    }

    public JobSearchDTO(Job job, int matchingScore) {
        this.job = job;
        this.matchingScore = matchingScore;
    }

    public JobSearchDTO(Job job, int matchingScore, MLMatchScoring.Result recommendation) {
        this(job, matchingScore);
        this.recommendation = recommendation;
    }

    public JobSearchDTO(Job job, int matchingScore, MLMatchScoring.Result recommendation, List<String> matchingReasons) {
        this(job, matchingScore, recommendation);
        this.matchingReasons = matchingReasons;
    }

    public String getContractorName() { return contractorName; }
    public void setContractorName(String contractorName) { this.contractorName = contractorName; }
    public List<String> getMatchingReasons() { return matchingReasons; }

    public MLMatchScoring.Result getRecommendation() {
        return recommendation;
    }

    public Job getJob() {
        return job;
    }

    public void setJob(Job job) {
        this.job = job;
    }

    public int getMatchingScore() {
        return matchingScore;
    }

    public void setMatchingScore(int matchingScore) {
        this.matchingScore = matchingScore;
    }
}
