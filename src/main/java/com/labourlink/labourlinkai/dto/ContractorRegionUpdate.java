package com.labourlink.labourlinkai.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ContractorRegionUpdate(
        @Size(max = 100) @Pattern(regexp = "[^\\p{Cc}]*") String state,
        @Size(max = 100) @Pattern(regexp = "[^\\p{Cc}]*") String district) {
}
