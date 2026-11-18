package com.labourlink.labourlinkai.security;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import java.security.SecureRandom;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class JwtUtilTest {
    private final ApplicationContextRunner production = new ApplicationContextRunner()
            .withUserConfiguration(JwtUtil.class)
            .withPropertyValues("spring.profiles.active=prod", "app.jwt.expiration=3600000");

    @Test
    void productionRefusesMissingKeyEvenWithLegacyAliases() {
        production.withPropertyValues("JWT_SECRET=", "APP_JWT_SECRET=" + newKey(),
                        "app.jwt.secret=" + newKey())
                .run(context -> assertThat(context).hasFailed()
                        .getFailure().hasRootCauseMessage(
                                "JWT_SECRET must be set to a generated key of at least 32 UTF-8 bytes"));
    }

    @Test
    void productionRefusesWeakKeyDuringStartup() {
        production.withPropertyValues("JWT_SECRET=too-short")
                .run(context -> assertThat(context).hasFailed()
                        .getFailure().hasRootCauseInstanceOf(IllegalStateException.class));
    }

    @Test
    void productionAcceptsConfiguredKeyAndRejectsTokensFromPreviousKey() {
        JwtUtil previous = new JwtUtil(newKey(), 3600000);
        String retiredToken = previous.generateToken("fixture-worker", "WORKER");
        assertThat(previous.validateToken(retiredToken)).isTrue();

        production.withPropertyValues("JWT_SECRET=" + newKey())
                .run(context -> {
                    assertThat(context).hasSingleBean(JwtUtil.class);
                    JwtUtil current = context.getBean(JwtUtil.class);
                    String token = current.generateToken("fixture-worker", "WORKER");
                    assertThat(current.validateToken(token)).isTrue();
                    assertThat(current.extractUsername(token)).isEqualTo("fixture-worker");
                    assertThat(current.extractRole(token)).isEqualTo("WORKER");
                    assertThat(current.validateToken(retiredToken)).isFalse();
                });
    }

    private static String newKey() {
        byte[] bytes = new byte[48];
        new SecureRandom().nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
