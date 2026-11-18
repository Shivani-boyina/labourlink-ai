package com.labourlink.labourlinkai.dto;

import java.time.Instant;
import com.labourlink.labourlinkai.entity.WorkerAllocation;

public class ApplicationResponseDTO {

    private Long applicationId;
    private Long jobId;
    private String jobTitle;
    private String jobLocation;
    private Double wagePerDay;
    private Long workerId;
    private String workerName;
    private String workerPhone;
    private String workerSkill;
    private Integer workerExperience;
    private String workerLocation;
    private Boolean workerAvailability;
    private Double workerExpectedWagePerDay;
    private String applicationDate;
    private Instant acceptedAt;
    private WorkerAllocation.Status allocationStatus;
    private String status;

    public ApplicationResponseDTO() {
    }

    public ApplicationResponseDTO(
            Long applicationId,
            Long jobId,
            String jobTitle,
            String jobLocation,
            Double wagePerDay,
            Long workerId,
            String workerName,
            String workerPhone,
            String workerSkill,
            Integer workerExperience,
            String workerLocation,
            Boolean workerAvailability,
            Double workerExpectedWagePerDay,
            String applicationDate,
            String status) {

        this.applicationId = applicationId;
        this.jobId = jobId;
        this.jobTitle = jobTitle;
        this.jobLocation = jobLocation;
        this.wagePerDay = wagePerDay;
        this.workerId = workerId;
        this.workerName = workerName;
        this.workerPhone = workerPhone;
        this.workerSkill = workerSkill;
        this.workerExperience = workerExperience;
        this.workerLocation = workerLocation;
        this.workerAvailability = workerAvailability;
        this.workerExpectedWagePerDay = workerExpectedWagePerDay;
        this.applicationDate = applicationDate;
        this.status = status;
    }

    public Long getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(Long applicationId) {
        this.applicationId = applicationId;
    }

    public Long getJobId() {
        return jobId;
    }

    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }

    public String getJobTitle() {
        return jobTitle;
    }

    public void setJobTitle(String jobTitle) {
        this.jobTitle = jobTitle;
    }

    public String getJobLocation() {
        return jobLocation;
    }

    public void setJobLocation(String jobLocation) {
        this.jobLocation = jobLocation;
    }

    public Double getWagePerDay() {
        return wagePerDay;
    }

    public void setWagePerDay(Double wagePerDay) {
        this.wagePerDay = wagePerDay;
    }

    public Long getWorkerId() {
        return workerId;
    }

    public void setWorkerId(Long workerId) {
        this.workerId = workerId;
    }

    public String getWorkerName() {
        return workerName;
    }

    public void setWorkerName(String workerName) {
        this.workerName = workerName;
    }

    public String getWorkerPhone() {
        return workerPhone;
    }

    public void setWorkerPhone(String workerPhone) {
        this.workerPhone = workerPhone;
    }

    public String getWorkerSkill() {
        return workerSkill;
    }

    public void setWorkerSkill(String workerSkill) {
        this.workerSkill = workerSkill;
    }

    public Integer getWorkerExperience() {
        return workerExperience;
    }

    public void setWorkerExperience(Integer workerExperience) {
        this.workerExperience = workerExperience;
    }

    public String getWorkerLocation() { return workerLocation; }
    public void setWorkerLocation(String workerLocation) { this.workerLocation = workerLocation; }
    public Boolean getWorkerAvailability() { return workerAvailability; }
    public void setWorkerAvailability(Boolean workerAvailability) { this.workerAvailability = workerAvailability; }
    public Double getWorkerExpectedWagePerDay() { return workerExpectedWagePerDay; }
    public void setWorkerExpectedWagePerDay(Double workerExpectedWagePerDay) { this.workerExpectedWagePerDay = workerExpectedWagePerDay; }

    public String getApplicationDate() {
        return applicationDate;
    }

    public Instant getAcceptedAt() { return acceptedAt; }
    public void setAcceptedAt(Instant acceptedAt) { this.acceptedAt = acceptedAt; }
    public WorkerAllocation.Status getAllocationStatus() { return allocationStatus; }
    public void setAllocationStatus(WorkerAllocation.Status allocationStatus) { this.allocationStatus = allocationStatus; }

    public void setApplicationDate(String applicationDate) {
        this.applicationDate = applicationDate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
