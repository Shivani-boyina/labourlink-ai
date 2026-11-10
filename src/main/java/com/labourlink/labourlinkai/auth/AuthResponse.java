package com.labourlink.labourlinkai.auth;

public record AuthResponse(
        String token,
        Long userId,
        String phone,
        String name,
        String role
) {}