package com.labourlink.labourlinkai.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "jobs")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long jobId;

    private String title;

    private String description;

    private String requiredSkill;

    private String location;

    private Double wagePerDay;

    private Integer requiredWorkers;

    private String status;

    private Long contractorId;

    public Job() {
    }

    public Job(Long jobId, String title, String description,
               String requiredSkill, String location,
               Double wagePerDay, Integer requiredWorkers,
               String status, Long contractorId) {

        this.jobId = jobId;
        this.title = title;
        this.description = description;
        this.requiredSkill = requiredSkill;
        this.location = location;
        this.wagePerDay = wagePerDay;
        this.requiredWorkers = requiredWorkers;
        this.status = status;
        this.contractorId = contractorId;
    }

    public Long getJobId() {
        return jobId;
    }

    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getRequiredSkill() {
        return requiredSkill;
    }

    public void setRequiredSkill(String requiredSkill) {
        this.requiredSkill = requiredSkill;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Double getWagePerDay() {
        return wagePerDay;
    }

    public void setWagePerDay(Double wagePerDay) {
        this.wagePerDay = wagePerDay;
    }

    public Integer getRequiredWorkers() {
        return requiredWorkers;
    }

    public void setRequiredWorkers(Integer requiredWorkers) {
        this.requiredWorkers = requiredWorkers;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Long getContractorId() {
        return contractorId;
    }

    public void setContractorId(Long contractorId) {
        this.contractorId = contractorId;
    }
}