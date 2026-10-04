package com.labourlink.labourlinkai.dto;

public class JobMatchDTO {

    private Long workerId;
    private String name;
    private String phone;
    private String skill;
    private Integer experience;
    private String location;
    private Boolean availability;
    private String matchReason;

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

    public void setMatchReason(String matchReason) {
        this.matchReason = matchReason;
    }
}