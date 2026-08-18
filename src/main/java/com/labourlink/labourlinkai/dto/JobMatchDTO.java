package com.labourlink.labourlinkai.dto;

import com.labourlink.labourlinkai.entity.Job;

public class JobMatchDTO {

    private Job job;
    private int matchingScore;

    public JobMatchDTO() {
    }

    public JobMatchDTO(Job job, int matchingScore) {
        this.job = job;
        this.matchingScore = matchingScore;
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