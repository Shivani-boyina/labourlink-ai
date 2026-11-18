-- Apply after Approach A cutover, with the approved journal and both original tables retained.
-- Set @approved_reconciliation_batch explicitly in the same migration session.
CREATE TEMPORARY TABLE batch104_archive_preflight (
    approved_manifest TINYINT NOT NULL CHECK (approved_manifest = 1)
);
INSERT INTO batch104_archive_preflight
SELECT @approved_reconciliation_batch IS NOT NULL
    AND COUNT(*) = 12 AND COUNT(DISTINCT original_record_id) = 12
    AND GROUP_CONCAT(original_record_id ORDER BY original_record_id) = '1,2,3,4,5,6,7,8,9,10,11,12'
FROM reconciliation_event
WHERE batch_id = @approved_reconciliation_batch AND record_type = 'APPLICATION';
DROP TEMPORARY TABLE batch104_archive_preflight;

CREATE TABLE archived_application_history (
    application_id BIGINT NOT NULL PRIMARY KEY,
    job_id BIGINT NOT NULL,
    job_title VARCHAR(255) NULL,
    original_worker_id BIGINT NULL,
    original_status VARCHAR(255) NULL,
    application_date VARCHAR(255) NULL
) ENGINE = InnoDB;

CREATE TABLE archived_application_worker_access (
    application_id BIGINT NOT NULL,
    worker_id BIGINT NOT NULL,
    PRIMARY KEY (application_id, worker_id),
    INDEX ix_archive_access_worker (worker_id, application_id),
    CONSTRAINT fk_archive_access_application FOREIGN KEY (application_id)
        REFERENCES archived_application_history (application_id) ON DELETE RESTRICT,
    CONSTRAINT fk_archive_access_worker FOREIGN KEY (worker_id)
        REFERENCES workers (worker_id) ON DELETE CASCADE
) ENGINE = InnoDB;

-- The journal selects the approved historical application records and canonical history entries.
-- Explicit verified account grants are a separate operation. This script creates none.
INSERT INTO archived_application_history
    (application_id, job_id, job_title, original_worker_id, original_status, application_date)
SELECT a.application_id, a.job_id, j.title, a.worker_id, a.status, a.application_date
FROM applications_legacy_step99 a
JOIN jobs_legacy_step99 j ON j.job_id = a.job_id
JOIN reconciliation_event e ON e.record_type = 'APPLICATION'
    AND e.original_record_id = a.application_id
WHERE e.batch_id = @approved_reconciliation_batch
    AND e.disposition IN ('PROVISIONAL_CANONICAL', 'UNRESOLVED_WORKER', 'PARENT_JOB_ARCHIVED');
