package com.labourlink.labourlinkai.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "labours")
public class Labour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String phone;
    private String skill;
    private String location;

    // ⭐ NEW FIELDS (SMART FEATURES)
    private boolean available = true;
    private double rating = 0.0;

    // constructors
    public Labour() {}

    public Labour(String name, String phone, String skill, String location,
                  boolean available, double rating) {
        this.name = name;
        this.phone = phone;
        this.skill = skill;
        this.location = location;
        this.available = available;
        this.rating = rating;
    }

    // getters & setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
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

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public boolean isAvailable() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }

    public double getRating() {
        return rating;
    }

    public void setRating(double rating) {
        this.rating = rating;
    }
}