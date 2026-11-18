package com.labourlink.labourlinkai.chat;

public record ChatWorkerResult(Long workerId, String name, String skill, String location,
                               Integer experience, Boolean availability, Double expectedWagePerDay) {}
