package com.labourlink.labourlinkai.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Entity
@Table(name = "workers")
public class Worker {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long workerId;

    @NotBlank(message = "Name is required")
    private String name;

    @Column(unique = true, nullable = false)
    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "\\d{10}", message = "Phone must be 10 digits")
    private String phone;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @NotBlank(message = "Password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotBlank(message = "Skill is required")
    private String skill;

    @NotNull(message = "Experience is required")
    @Min(value = 0, message = "Experience cannot be negative")
    private Integer experience;

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

    @Transient
    private Double averageRating;

    @Transient
    private long reviewCount;

    @NotNull(message = "Availability is required")
    private Boolean availability;

    @Min(value = 0, message = "Expected daily wage cannot be negative")
    private Double expectedWagePerDay;

    @Column(nullable = true)
    private Double latitude;

    @Column(nullable = true)
    private Double longitude;

    @Column(nullable = true)
    private Boolean locationShared = false;

    public Worker() {
    }

    public Worker(
            Long workerId,
            String name,
            String phone,
            String password,
            String skill,
            Integer experience,
            String location,
            Boolean availability) {

        this.workerId = workerId;
        this.name = name;
        this.phone = phone;
        this.password = password;
        this.skill = skill;
        this.experience = experience;
        this.location = location;
        this.availability = availability;
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

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
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

    public String getCategory() { return category; }
    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public Double getAverageRating() { return averageRating; }

    @JsonProperty(access = JsonProperty.Access.READ_ONLY)
    public long getReviewCount() { return reviewCount; }

    public void applyRating(Double average, long count) {
        averageRating = average;
        reviewCount = count;
    }
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

    public Boolean getAvailability() {
        return availability;
    }

    public void setAvailability(Boolean availability) {
        this.availability = availability;
    }

    public Double getExpectedWagePerDay() { return expectedWagePerDay; }
    public void setExpectedWagePerDay(Double expectedWagePerDay) { this.expectedWagePerDay = expectedWagePerDay; }
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }
    public boolean isLocationShared() { return Boolean.TRUE.equals(locationShared); }
    public void setLocationShared(boolean locationShared) { this.locationShared = locationShared; }
}
