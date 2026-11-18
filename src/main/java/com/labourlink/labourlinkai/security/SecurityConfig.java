package com.labourlink.labourlinkai.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.DispatcherType;
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

                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED))
                )

                .authorizeHttpRequests(auth -> auth

                        // Preserve the original status when the servlet container renders an error.
                        .dispatcherTypeMatchers(DispatcherType.ERROR)
                        .permitAll()

                        // Browser preflight
                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()

                        // Public endpoints
                        .requestMatchers(
                                "/",
                                "/api/chat",
                                "/auth/login",
                                "/auth/worker/login",
                                "/workers/register",
                                "/contractors/register"
                        )
                        .permitAll()

                        // Worker-specific job application endpoints
                        .requestMatchers("/analytics/**").hasRole("CONTRACTOR")
                        .requestMatchers(HttpMethod.POST, "/applications")
                        .hasRole("WORKER")

                        .requestMatchers(HttpMethod.GET, "/applications/my", "/applications/history/archived")
                        .hasRole("WORKER")

                        .requestMatchers(HttpMethod.GET, "/jobs/recommendations/me")
                        .hasRole("WORKER")

                        .requestMatchers(HttpMethod.GET, "/allocations/worker", "/allocations/worker/**")
                        .hasRole("WORKER")

                        .requestMatchers("/allocations/contractor", "/allocations/contractor/**")
                        .hasRole("CONTRACTOR")

                        .requestMatchers("/allocations/**")
                        .denyAll()

                        .requestMatchers("/replacements/worker/**")
                        .hasRole("WORKER")

                        .requestMatchers("/replacements/contractor/**")
                        .hasRole("CONTRACTOR")

                        .requestMatchers("/replacements/**")
                        .denyAll()

                        .requestMatchers(HttpMethod.GET, "/reviews/worker")
                        .hasRole("WORKER")

                        .requestMatchers("/reviews/contractor", "/reviews/contractor/**")
                        .hasRole("CONTRACTOR")

                        .requestMatchers("/reviews/**")
                        .denyAll()

                        // Contractor-specific job & application management endpoints
                        .requestMatchers(HttpMethod.POST, "/jobs")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.PUT, "/jobs/**")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.PATCH, "/jobs/*/close")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.DELETE, "/jobs/**")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.GET, "/jobs/*/matches")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.GET, "/applications/job/**", "/applications/history/contractor")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.PUT, "/applications/*/status")
                        .hasRole("CONTRACTOR")

                        // Worker profile vs worker directory search
                        .requestMatchers("/workers/me")
                        .hasRole("WORKER")

                        .requestMatchers(HttpMethod.GET, "/workers", "/workers/search")
                        .hasRole("CONTRACTOR")

                        .requestMatchers("/workers/**")
                        .hasRole("WORKER")

                        // Contractor directory search
                        .requestMatchers(HttpMethod.GET, "/contractors", "/contractors/search")
                        .hasAnyRole("WORKER", "CONTRACTOR")

                        .requestMatchers("/contractors/**")
                        .hasRole("CONTRACTOR")

                        // Published job search can be browsed before login; mutations remain role protected.
                        .requestMatchers(HttpMethod.GET, "/jobs/**")
                        .permitAll()

                        // Legacy labour records have no account ownership model: reads are contractor-only and writes are disabled.
                        .requestMatchers(HttpMethod.POST, "/labours/**")
                        .denyAll()

                        .requestMatchers(HttpMethod.PUT, "/labours/**")
                        .denyAll()

                        .requestMatchers(HttpMethod.DELETE, "/labours/**")
                        .denyAll()

                        .requestMatchers(HttpMethod.GET, "/labours/**")
                        .hasRole("CONTRACTOR")

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
