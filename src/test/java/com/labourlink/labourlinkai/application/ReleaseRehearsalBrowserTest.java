package com.labourlink.labourlinkai.application;

import com.labourlink.labourlinkai.TestDatabaseSafetyInitializer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.ActiveProfiles;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"server.address=127.0.0.1", "spring.jpa.open-in-view=false"})
@ContextConfiguration(initializers = TestDatabaseSafetyInitializer.class)
@ActiveProfiles("release-browser")
@EnabledIfEnvironmentVariable(named = "LABOURLINK_RELEASE_BROWSER", matches = "true")
class ReleaseRehearsalBrowserTest {
    @LocalServerPort int port;
    @Value("${JWT_SECRET}") String scratchJwtSecret;

    @Test
    void browserRehearsalUsesTheVerifiedScratchApplication() throws Exception {
        String run = System.getenv("LABOURLINK_RELEASE_RUN");
        if (run == null || !Path.of(run).toRealPath().getFileName().toString().matches("[a-f0-9]{32}")) {
            throw new IllegalStateException("Missing release scratch directory");
        }
        Path output = Path.of(run, "browser-output.log");
        var command = new ProcessBuilder("node", "src/test/browser/release-rehearsal.mjs")
                .redirectErrorStream(true).redirectOutput(output.toFile());
        command.environment().put("LABOURLINK_RELEASE_BACKEND", "http://127.0.0.1:" + port);
        command.environment().put("LABOURLINK_RELEASE_JWT_CANARY", scratchJwtSecret);
        var browser = command.start();
        try {
            boolean finished = browser.waitFor(180, TimeUnit.SECONDS);
            try (var lines = Files.lines(output)) {
                lines.filter(line -> line.startsWith("BROWSER ")).forEach(System.out::println);
            }
            assertThat(finished).as("browser runner finished").isTrue();
            assertThat(browser.exitValue()).as("browser workflows and security assertions").isZero();
        } finally {
            if (browser.isAlive()) browser.destroyForcibly();
        }
    }
}
