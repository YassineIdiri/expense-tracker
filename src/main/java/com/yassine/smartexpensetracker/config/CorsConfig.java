package com.yassine.smartexpensetracker.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Origine EXACTE du front (pas "*")
        config.setAllowedOrigins(List.of("http://localhost:4200"));

        // Méthodes (inclut OPTIONS pour le préflight)
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Headers nécessaires (Authorization + Content-Type)
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));

        // Si tu veux lire des headers côté front (optionnel)
        config.setExposedHeaders(List.of("Set-Cookie"));

        // ✅ OBLIGATOIRE pour cookies (refresh HttpOnly)
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config); // plus simple que /api/**
        return source;
    }
}
