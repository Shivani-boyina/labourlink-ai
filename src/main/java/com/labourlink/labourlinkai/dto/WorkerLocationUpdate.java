package com.labourlink.labourlinkai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record WorkerLocationUpdate(
        @NotBlank @Size(max = 200) String location,
        boolean shareLocation,
        Double latitude,
        Double longitude
) {}
