package com.labourlink.labourlinkai.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    public SecurityConfig(JwtFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())

                .cors(cors -> cors.configurationSource(
                        corsConfigurationSource()
                ))

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        // Browser preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()

                        // Public endpoints
                        .requestMatchers(
                                "/",
                                "/auth/login",
                                "/auth/worker/login",
                                "/workers/register",
                                "/contractors/register"
                        )
                        .permitAll()

                        // Worker-specific job application endpoints
                        .requestMatchers(HttpMethod.POST, "/applications")
                        .hasRole("WORKER")

                        .requestMatchers(HttpMethod.GET, "/applications/my")
                        .hasRole("WORKER")

                        // Contractor-specific job & application management endpoints
                        .requestMatchers(HttpMethod.POST, "/jobs")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.DELETE, "/jobs/**")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.GET, "/jobs/*/matches")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.GET, "/applications/job/**")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.PUT, "/applications/*/status")
                        .hasRole("CONTRACTOR")

                        // Worker profile vs worker directory search
                        .requestMatchers("/workers/me")
                        .hasRole("WORKER")

                        .requestMatchers(HttpMethod.GET, "/workers", "/workers/search")
                        .hasAnyRole("WORKER", "CONTRACTOR")

                        .requestMatchers("/workers/**")
                        .hasRole("WORKER")

                        // Contractor directory search
                        .requestMatchers(HttpMethod.GET, "/contractors", "/contractors/search")
                        .hasAnyRole("WORKER", "CONTRACTOR")

                        .requestMatchers("/contractors/**")
                        .hasRole("CONTRACTOR")

                        // Job browsing and search (both authenticated roles)
                        .requestMatchers(HttpMethod.GET, "/jobs/**")
                        .authenticated()

                        // Everything else
                        .anyRequest()
                        .authenticated()
                )

                .addFilterBefore(
                        jwtFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOriginPatterns(
                List.of("http://localhost:5173", "http://localhost:3000", "http://localhost:8080")
        );

        configuration.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "DELETE",
                        "PATCH",
                        "OPTIONS"
                )
        );

        configuration.setAllowedHeaders(
                List.of("*")
        );

        configuration.setExposedHeaders(
                List.of("Authorization")
        );

        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                configuration
        );

        return source;
    }
}
