package com.labourlink.labourlinkai.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.JwtParser;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Date;

@Component
public class JwtUtil {

    private final SecretKey signingKey;
    private final JwtParser parser;
    private final long expirationTime;

    public JwtUtil(
            @Value("${JWT_SECRET:}") String secret,
            @Value("${app.jwt.expiration}") long expirationTime) {

        if (secret.isBlank() || secret.getBytes(StandardCharsets.UTF_8).length < 32
                || "replace_with_a_generated_secret".equals(secret)) {
            throw new IllegalStateException("JWT_SECRET must be set to a generated key of at least 32 UTF-8 bytes");
        }
        this.signingKey = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        this.parser = Jwts.parserBuilder().setSigningKey(signingKey).build();
        this.expirationTime = expirationTime;
    }

    // Generate JWT token with role
    public String generateToken(String username, String role) {

        return Jwts.builder()
                .setSubject(username)
                .claim("role", role)
                .setIssuedAt(new Date())
                .setExpiration(
                        new Date(System.currentTimeMillis() + expirationTime)
                )
                .signWith(signingKey, SignatureAlgorithm.HS256)
                .compact();
    }

    // Extract username from JWT
    public String extractUsername(String token) {

        return parser
                .parseClaimsJws(token)
                .getBody()
                .getSubject();
    }

    // Extract role from JWT
    public String extractRole(String token) {

        return parser
                .parseClaimsJws(token)
                .getBody()
                .get("role", String.class);
    }

    // Validate JWT token
    public boolean validateToken(String token) {

        try {
            extractUsername(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
