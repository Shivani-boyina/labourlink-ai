-- Optional explicit equivalent of Hibernate's additive analytics table creation.
-- No existing worker, job, application or allocation rows are modified.
CREATE TABLE IF NOT EXISTS analytics_validation_runs (
    id VARCHAR(255) NOT NULL PRIMARY KEY,
    status VARCHAR(255) NULL,
    started_at DATETIME(6) NULL,
    completed_at DATETIME(6) NULL,
    report LONGTEXT NULL,
    error VARCHAR(255) NULL
) ENGINE = InnoDB;
