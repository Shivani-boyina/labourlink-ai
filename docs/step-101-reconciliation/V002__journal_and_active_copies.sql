-- Run only after V001 in the same isolated client session.
CREATE TABLE reconciliation_event (
    event_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    batch_id VARCHAR(64) NOT NULL,
    record_type ENUM('JOB', 'APPLICATION') NOT NULL,
    original_record_id BIGINT NOT NULL,
    original_job_id BIGINT NULL,
    original_worker_id BIGINT NULL,
    original_contractor_id BIGINT NULL,
    original_status VARCHAR(255) NULL,
    original_submission_date VARCHAR(255) NULL,
    disposition VARCHAR(64) NOT NULL,
    canonical_application_id BIGINT NULL,
    approved_by VARCHAR(128) NOT NULL,
    recorded_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX ix_reconciliation_record (record_type, original_record_id, event_id)
) ENGINE=InnoDB;

INSERT INTO reconciliation_event
    (batch_id, record_type, original_record_id, original_job_id, original_worker_id,
     original_contractor_id, original_status, original_submission_date,
     disposition, canonical_application_id, approved_by)
SELECT 'step101-rehearsal', 'JOB', job_id, job_id, NULL, contractor_id, status,
       NULL, 'UNRESOLVED_OWNER', NULL, 'Step 101 user approval (isolated only)'
FROM jobs WHERE job_id IN (1,2)
UNION ALL
SELECT 'step101-rehearsal', 'APPLICATION', a.application_id, a.job_id, a.worker_id,
       j.contractor_id, a.status, a.application_date,
       CASE a.application_id WHEN 1 THEN 'PROVISIONAL_CANONICAL'
            WHEN 2 THEN 'UNRESOLVED_WORKER'
            WHEN 3 THEN 'DUPLICATE_ARCHIVED' ELSE 'PARENT_JOB_ARCHIVED' END,
       CASE WHEN a.application_id = 3 THEN 1 ELSE NULL END,
       'Step 101 user approval (isolated only)'
FROM applications a JOIN jobs j ON j.job_id = a.job_id
WHERE a.application_id BETWEEN 1 AND 12;

CREATE TABLE jobs_reconciled LIKE jobs;
CREATE TABLE applications_reconciled LIKE applications;

INSERT INTO jobs_reconciled SELECT * FROM jobs WHERE job_id NOT IN (1,2);
INSERT INTO applications_reconciled SELECT * FROM applications
WHERE application_id NOT BETWEEN 1 AND 12;

SET @job_next = (SELECT AUTO_INCREMENT FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'jobs');
SET @app_next = (SELECT AUTO_INCREMENT FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'applications');
SET @step101_ddl = CONCAT('ALTER TABLE jobs_reconciled AUTO_INCREMENT = ', @job_next);
PREPARE step101_stmt FROM @step101_ddl;
EXECUTE step101_stmt;
DEALLOCATE PREPARE step101_stmt;
SET @step101_ddl = CONCAT('ALTER TABLE applications_reconciled AUTO_INCREMENT = ', @app_next);
PREPARE step101_stmt FROM @step101_ddl;
EXECUTE step101_stmt;
DEALLOCATE PREPARE step101_stmt;

ALTER TABLE jobs_reconciled
    MODIFY contractor_id BIGINT NOT NULL,
    ADD CONSTRAINT fk_step101_job_contractor FOREIGN KEY (contractor_id)
        REFERENCES contractors (contractor_id) ON DELETE RESTRICT;
ALTER TABLE applications_reconciled
    MODIFY job_id BIGINT NOT NULL,
    MODIFY worker_id BIGINT NOT NULL,
    ADD CONSTRAINT fk_step101_application_job FOREIGN KEY (job_id)
        REFERENCES jobs_reconciled (job_id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_step101_application_worker FOREIGN KEY (worker_id)
        REFERENCES workers (worker_id) ON DELETE RESTRICT,
    ADD CONSTRAINT uq_step101_application_pair UNIQUE (job_id, worker_id);

INSERT INTO step101_assert VALUES
('active copy counts', (SELECT COUNT(*) FROM jobs_reconciled) = 4
    AND (SELECT COUNT(*) FROM applications_reconciled) = 2),
('journal count', (SELECT COUNT(*) FROM reconciliation_event) = 14),
('job high water', (SELECT AUTO_INCREMENT FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'jobs_reconciled') = @job_next),
('application high water', (SELECT AUTO_INCREMENT FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'applications_reconciled') = @app_next);
