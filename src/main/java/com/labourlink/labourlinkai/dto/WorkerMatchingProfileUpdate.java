package com.labourlink.labourlinkai.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.PositiveOrZero;

public record WorkerMatchingProfileUpdate(
        @Size(max = 100) @Pattern(regexp = "[^\\p{Cc}]*") String category,
        @Size(max = 100) @Pattern(regexp = "[^\\p{Cc}]*") String state,
        @Size(max = 100) @Pattern(regexp = "[^\\p{Cc}]*") String district,
        @PositiveOrZero Double expectedWagePerDay) {
}
