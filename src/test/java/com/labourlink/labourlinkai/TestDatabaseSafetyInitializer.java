package com.labourlink.labourlinkai;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.Map;
import java.util.UUID;

import org.springframework.context.ApplicationContextInitializer;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.MapPropertySource;

/** Proves the Windows named-pipe target before Spring can open its datasource. */
public final class TestDatabaseSafetyInitializer implements ApplicationContextInitializer<ConfigurableApplicationContext> {
    private static final String PREFIX = "LabourLinkRestore_";
    private static final String SCHEMA = "labourlinkai_restore_check";
    private static final String DATABASE_USER = "step105_test";

    @Override
    public void initialize(ConfigurableApplicationContext context) {
        try {
            String account = context.getEnvironment().matchesProfiles("release-browser")
                    ? "release_browser_runtime" : DATABASE_USER;
            String url = verifiedUrl(account);
            context.getEnvironment().getPropertySources().addFirst(new MapPropertySource("verifiedScratchDatasource", Map.of(
                    "spring.datasource.url", url,
                    "spring.datasource.username", account,
                    "spring.datasource.password", "",
                    "spring.jpa.hibernate.ddl-auto", "validate",
                    "spring.jpa.show-sql", false,
                    "spring.sql.init.mode", "never",
                    "JWT_SECRET", UUID.randomUUID().toString())));
        } catch (Exception failure) {
            throw new IllegalStateException("Refusing to start tests without a verified named-pipe scratch database", failure);
        }
    }

    private static String verifiedUrl(String account) throws Exception {
        String pipe = System.getenv("LABOURLINK_BATCH105_PIPE");
        if (pipe == null || !pipe.matches(PREFIX + "[a-f0-9]{32}")) {
            throw new IllegalStateException("Missing or invalid scratch pipe");
        }
        String runId = pipe.substring(PREFIX.length());
        Path root = Path.of(System.getenv("LOCALAPPDATA"), "LabourLinkAI", "RestoreVerification").toRealPath();
        Path run = root.resolve(runId).toRealPath();
        Path data = run.resolve("data").toRealPath();
        if (!run.equals(root.resolve(runId)) || !data.equals(run.resolve("data")) || !Files.isDirectory(data)) {
            throw new IllegalStateException("Unexpected scratch directory");
        }
        Path pidFile = run.resolve("server.pid").toRealPath();
        long serverPid = Long.parseLong(Files.readString(pidFile).strip());
        Path executable = Path.of("C:/Program Files/MySQL/MySQL Server 9.7/bin/mysqld.exe").toRealPath();
        ProcessHandle process = ProcessHandle.of(serverPid).orElseThrow();
        if (!Files.isSameFile(Path.of(process.info().command().orElseThrow()), executable)) {
            throw new IllegalStateException("Unexpected MySQL server executable");
        }
        String pipePath = URLEncoder.encode("\\\\.\\pipe\\" + pipe, StandardCharsets.UTF_8);
        String url = "jdbc:mysql://localhost/" + SCHEMA
                + "?socketFactory=com.mysql.cj.protocol.NamedPipeSocketFactory&sslMode=DISABLED"
                + "&connectTimeout=5000&path=" + pipePath;
        try (var connection = DriverManager.getConnection(url, account, "");
             var statement = connection.createStatement();
             var identity = statement.executeQuery("""
                     SELECT DATABASE(), @@datadir, @@socket, @@skip_networking, VERSION(), @@pid_file,
                         (SELECT COUNT(*) FROM information_schema.plugins WHERE plugin_name = 'mysqlx' AND plugin_status = 'ACTIVE')
                     """)) {
            if (!identity.next() || !SCHEMA.equals(identity.getString(1))
                    || !Files.isSameFile(Path.of(identity.getString(2)), data)
                    || !pipe.equalsIgnoreCase(identity.getString(3)) || !identity.getBoolean(4)
                    || !identity.getString(5).startsWith("9.7.")
                    || !Files.isSameFile(Path.of(identity.getString(6)), pidFile) || identity.getInt(7) != 0) {
                throw new IllegalStateException("JDBC reached an unexpected MySQL instance");
            }
        }
        return url;
    }
}
