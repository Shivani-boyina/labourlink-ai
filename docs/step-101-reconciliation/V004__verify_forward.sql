-- Run after V003 and before U003, in the same scratch client session.
INSERT INTO step101_assert VALUES
('active counts', (SELECT COUNT(*) FROM jobs) = 4 AND (SELECT COUNT(*) FROM applications) = 2),
('legacy counts', (SELECT COUNT(*) FROM jobs_legacy_step99) = 6
    AND (SELECT COUNT(*) FROM applications_legacy_step99) = 14),
('journal matches original job data', (SELECT COUNT(*) FROM reconciliation_event e
    JOIN jobs_legacy_step99 j ON j.job_id = e.original_record_id
    WHERE e.record_type = 'JOB' AND e.original_status <=> j.status
    AND e.original_contractor_id = j.contractor_id) = 2),
('journal matches original application data', (SELECT COUNT(*) FROM reconciliation_event e
    JOIN applications_legacy_step99 a ON a.application_id = e.original_record_id
    JOIN jobs_legacy_step99 j ON j.job_id = a.job_id
    WHERE e.record_type = 'APPLICATION' AND e.original_status <=> a.status
    AND e.original_submission_date <=> a.application_date
    AND e.original_job_id = a.job_id AND e.original_worker_id = a.worker_id
    AND e.original_contractor_id = j.contractor_id) = 12),
('candidate dispositions', (SELECT COUNT(*) FROM reconciliation_event
    WHERE record_type = 'APPLICATION' AND (
       (original_record_id = 1 AND disposition = 'PROVISIONAL_CANONICAL' AND canonical_application_id IS NULL)
    OR (original_record_id = 2 AND disposition = 'UNRESOLVED_WORKER' AND original_worker_id = 2)
    OR (original_record_id = 3 AND disposition = 'DUPLICATE_ARCHIVED' AND canonical_application_id = 1)
    )) = 3),
('jobs one and two inactive', (SELECT COUNT(*) FROM jobs WHERE job_id IN (1,2)) = 0),
('historical applications inactive', (SELECT COUNT(*) FROM applications
    WHERE application_id BETWEEN 1 AND 12) = 0),
('active jobs preserved', (SELECT COUNT(*) FROM jobs
    JOIN jobs_legacy_step99 USING (job_id)) = 4),
('active applications preserved', (SELECT COUNT(*) FROM applications a
    JOIN applications_legacy_step99 b USING (application_id)
    WHERE a.worker_id = b.worker_id AND a.job_id = b.job_id
    AND a.status <=> b.status AND a.application_date <=> b.application_date) = 2),
('historical accepted count preserved', (SELECT COUNT(*) FROM applications_legacy_step99
    WHERE job_id = 1 AND status = 'ACCEPTED') = 10),
('unaffected accepted counts unchanged', NOT EXISTS (
    SELECT 1 FROM jobs j WHERE
        (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.job_id AND a.status = 'ACCEPTED')
        <> (SELECT COUNT(*) FROM applications_legacy_step99 a
            WHERE a.job_id = j.job_id AND a.status = 'ACCEPTED'))),
('unaffected job capacity unchanged', NOT EXISTS (
    SELECT 1 FROM jobs j JOIN jobs_legacy_step99 old USING (job_id)
    WHERE NOT (j.required_workers <=> old.required_workers))),
('foreign key targets', (SELECT COUNT(*) FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE() AND referenced_table_schema = DATABASE()
    AND ((table_name = 'jobs' AND column_name = 'contractor_id' AND referenced_table_name = 'contractors')
      OR (table_name = 'applications' AND column_name = 'job_id' AND referenced_table_name = 'jobs')
      OR (table_name = 'applications' AND column_name = 'worker_id' AND referenced_table_name = 'workers'))) = 3),
('restrictive deletes', (SELECT COUNT(*) FROM information_schema.referential_constraints
    WHERE constraint_schema = DATABASE() AND constraint_name IN
    ('fk_step101_job_contractor','fk_step101_application_job','fk_step101_application_worker')
    AND delete_rule = 'RESTRICT') = 3),
('pair index', (SELECT GROUP_CONCAT(column_name ORDER BY seq_in_index) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'applications'
    AND index_name = 'uq_step101_application_pair' AND non_unique = 0) = 'job_id,worker_id'),
('job next ID after rename', (SELECT AUTO_INCREMENT FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'jobs') = @job_next),
('application next ID after rename', (SELECT AUTO_INCREMENT FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'applications') = @app_next);

DELIMITER $$
CREATE PROCEDURE step101_assert_constraints()
BEGIN
    DECLARE rejected BOOLEAN DEFAULT FALSE;
    DECLARE job_key BIGINT;
    DECLARE application_key BIGINT;
    SELECT MIN(job_id) INTO job_key FROM jobs;
    SELECT MIN(application_id) INTO application_key FROM applications;

    START TRANSACTION;
    SAVEPOINT before_probe;
    BEGIN
        DECLARE CONTINUE HANDLER FOR 1452 SET rejected = TRUE;
        UPDATE jobs SET contractor_id = 1 WHERE job_id = job_key;
    END;
    ROLLBACK TO SAVEPOINT before_probe;
    INSERT INTO step101_assert VALUES ('missing contractor rejected', rejected);

    SET rejected = FALSE;
    SAVEPOINT before_probe;
    BEGIN
        DECLARE CONTINUE HANDLER FOR 1452 SET rejected = TRUE;
        UPDATE applications SET worker_id = 2 WHERE application_id = application_key;
    END;
    ROLLBACK TO SAVEPOINT before_probe;
    INSERT INTO step101_assert VALUES ('missing worker rejected', rejected);

    SET rejected = FALSE;
    SAVEPOINT before_probe;
    BEGIN
        DECLARE CONTINUE HANDLER FOR 1452 SET rejected = TRUE;
        UPDATE applications SET job_id = 1 WHERE application_id = application_key;
    END;
    ROLLBACK TO SAVEPOINT before_probe;
    INSERT INTO step101_assert VALUES ('archived job rejected as active parent', rejected);

    SET rejected = FALSE;
    SAVEPOINT before_probe;
    BEGIN
        DECLARE CONTINUE HANDLER FOR 1062 SET rejected = TRUE;
        INSERT INTO applications (application_id, job_id, worker_id, status, application_date)
        SELECT -1, job_id, worker_id, status, application_date
        FROM applications WHERE application_id = application_key;
    END;
    ROLLBACK TO SAVEPOINT before_probe;
    INSERT INTO step101_assert VALUES ('duplicate pair rejected', rejected);
    COMMIT;
END$$
DELIMITER ;
CALL step101_assert_constraints();
DROP PROCEDURE step101_assert_constraints;

SELECT 'FORWARD_OK', COUNT(*) FROM step101_assert;
SELECT 'COUNTS', (SELECT COUNT(*) FROM jobs), (SELECT COUNT(*) FROM applications),
    (SELECT COUNT(*) FROM jobs_legacy_step99), (SELECT COUNT(*) FROM applications_legacy_step99),
    (SELECT COUNT(*) FROM reconciliation_event);
SELECT 'HIGH_WATER', @job_next, @app_next;
SELECT 'CAPACITY', j.job_id, j.status, j.required_workers,
    (SELECT COUNT(*) FROM applications a WHERE a.job_id = j.job_id AND a.status = 'ACCEPTED')
FROM jobs j ORDER BY j.job_id;
