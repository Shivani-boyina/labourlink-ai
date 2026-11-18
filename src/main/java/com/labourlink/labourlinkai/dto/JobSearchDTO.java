package com.labourlink.labourlinkai.dto;

import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.integration.MLMatchScoring;

public class JobSearchDTO {

    private Job job;
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
