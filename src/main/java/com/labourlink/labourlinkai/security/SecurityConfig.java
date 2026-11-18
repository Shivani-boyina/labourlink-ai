
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
                        .authenticationEntryPoint(
                                (request, response, authException) ->
                                        response.sendError(
                                                HttpServletResponse.SC_UNAUTHORIZED
                                        )
                        )
                )

                .authorizeHttpRequests(auth -> auth

                        // Allow servlet error dispatches
                        .dispatcherTypeMatchers(DispatcherType.ERROR)
                        .permitAll()

                        // Allow browser CORS preflight requests
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

                        // Analytics: contractor only
                        .requestMatchers("/analytics/**")
                        .hasRole("CONTRACTOR")

                        // Worker job applications
                        .requestMatchers(HttpMethod.POST, "/applications")
                        .hasRole("WORKER")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/applications/my",
                                "/applications/history/archived"
                        )
                        .hasRole("WORKER")

                        // Worker job recommendations
                        .requestMatchers(
                                HttpMethod.GET,
                                "/jobs/recommendations/me"
                        )
                        .hasRole("WORKER")

                        // Worker allocations
                        .requestMatchers(
                                HttpMethod.GET,
                                "/allocations/worker",
                                "/allocations/worker/**"
                        )
                        .hasRole("WORKER")

                        // Contractor allocations
                        .requestMatchers(
                                "/allocations/contractor",
                                "/allocations/contractor/**"
                        )
                        .hasRole("CONTRACTOR")

                        .requestMatchers("/allocations/**")
                        .denyAll()

                        // Worker replacements
                        .requestMatchers("/replacements/worker/**")
                        .hasRole("WORKER")

                        // Contractor replacements
                        .requestMatchers("/replacements/contractor/**")
                        .hasRole("CONTRACTOR")

                        .requestMatchers("/replacements/**")
                        .denyAll()

                        // Worker reviews
                        .requestMatchers(
                                HttpMethod.GET,
                                "/reviews/worker"
                        )
                        .hasRole("WORKER")

                        // Contractor reviews
                        .requestMatchers(
                                "/reviews/contractor",
                                "/reviews/contractor/**"
                        )
                        .hasRole("CONTRACTOR")

                        .requestMatchers("/reviews/**")
                        .denyAll()

                        // Contractor job management
                        .requestMatchers(HttpMethod.POST, "/jobs")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.PUT, "/jobs/**")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/jobs/*/close"
                        )
                        .hasRole("CONTRACTOR")

                        .requestMatchers(HttpMethod.DELETE, "/jobs/**")
                        .hasRole("CONTRACTOR")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/jobs/*/matches"
                        )
                        .hasRole("CONTRACTOR")

                        // Contractor application management
                        .requestMatchers(
                                HttpMethod.GET,
                                "/applications/job/**",
                                "/applications/history/contractor"
                        )
                        .hasRole("CONTRACTOR")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/applications/*/status"
                        )
                        .hasRole("CONTRACTOR")

                        // Worker profile
                        .requestMatchers("/workers/me")
                        .hasRole("WORKER")

                        // Worker directory
                        .requestMatchers(
                                HttpMethod.GET,
                                "/workers",
                                "/workers/search"
                        )
                        .hasRole("CONTRACTOR")

                        .requestMatchers("/workers/**")
                        .hasRole("WORKER")

                        // Contractor directory
                        .requestMatchers(
                                HttpMethod.GET,
                                "/contractors",
                                "/contractors/search"
                        )
                        .hasAnyRole("WORKER", "CONTRACTOR")

                        .requestMatchers("/contractors/**")
                        .hasRole("CONTRACTOR")

                        // Public job browsing
                        .requestMatchers(HttpMethod.GET, "/jobs/**")
                        .permitAll()

                        // Legacy labour records: block writes
                        .requestMatchers(HttpMethod.POST, "/labours/**")
                        .denyAll()

                        .requestMatchers(HttpMethod.PUT, "/labours/**")
                        .denyAll()

                        .requestMatchers(HttpMethod.DELETE, "/labours/**")
                        .denyAll()

                        // Contractor-only labour reads
                        .requestMatchers(HttpMethod.GET, "/labours/**")
                        .hasRole("CONTRACTOR")

                        // All other requests require authentication
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

        // Local development + deployed React frontend
        configuration.setAllowedOriginPatterns(
                List.of(
                        "http://localhost:5173",
                        "http://localhost:3000",
                        "http://localhost:8080",
                        "https://labourlink-ai-frontend.onrender.com"
                )
        );

        // Allowed HTTP methods
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

        // Allow request headers, including Authorization
        configuration.setAllowedHeaders(
                List.of("*")
        );

        // Expose Authorization response header
        configuration.setExposedHeaders(
                List.of("Authorization")
        );

        // JWT bearer tokens; no cross-origin cookies required
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
