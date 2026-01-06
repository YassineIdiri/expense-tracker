package com.yassine.smartexpensetracker.auth.dto;

public record AuthResponse(
        String accessToken,
        long expiresIn // en secondes
) {}

