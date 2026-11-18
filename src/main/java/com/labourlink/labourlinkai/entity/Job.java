package com.labourlink.labourlinkai.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.AssertTrue;
import com.fasterxml.jackson.annotation.JsonIgnore;
import java.time.LocalDate;

@Entity
@Table(name = "jobs")
public class Job {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long jobId;

    @NotBlank(message = "Job title is required")
    private String title;

    private String description;

    @NotBlank(message = "Required skill is required")
    private String requiredSkill;

    @NotBlank(message = "Location is required")
    private String location;

    @Column(length = 100)
    @jakarta.validation.constraints.Size(max = 100)
    @jakarta.validation.constraints.Pattern(regexp = "[^\\p{Cc}]*")
    private String category;

    @Column(length = 100)
    @jakarta.validation.constraints.Size(max = 100)
    @jakarta.validation.constraints.Pattern(regexp = "[^\\p{Cc}]*")
    private String state;

    @Column(length = 100)
    @jakarta.validation.constraints.Size(max = 100)
    @jakarta.validation.constraints.Pattern(regexp = "[^\\p{Cc}]*")
    private String district;

    @Min(value = 0, message = "Minimum experience cannot be negative")
    private Integer minimumExperience;

    @Min(value = 1, message = "Duration must be at least one day")
    private Integer durationDays;
    private LocalDate startDate;
    private LocalDate endDate;
    @Transient
    private boolean scheduleUpdateRequested;

    @NotNull(message = "Wage is required")
    @Min(value = 1, message = "Wage must be greater than 0")
    private Double wagePerDay;

    @NotNull(message = "Required workers is required")
    @Min(value = 1, message = "Required workers must be greater than 0")
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

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getDistrict() { return district; }
    public void setDistrict(String district) { this.district = district; }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Integer getMinimumExperience() { return minimumExperience; }
    public void setMinimumExperience(Integer minimumExperience) { this.minimumExperience = minimumExperience; }
    public Integer getDurationDays() { return durationDays; }
    public void setDurationDays(Integer durationDays) { this.durationDays = durationDays; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
        scheduleUpdateRequested = true;
    }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
        scheduleUpdateRequested = true;
    }

    public boolean hasScheduleUpdate() { return scheduleUpdateRequested; }

    @JsonIgnore
    @AssertTrue(message = "Provide both schedule dates with end date on or after start date")
    public boolean isScheduleValid() {
        return startDate == null ? endDate == null : endDate != null && !endDate.isBefore(startDate);
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
