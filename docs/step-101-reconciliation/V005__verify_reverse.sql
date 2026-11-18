-- Run after U003 in the same scratch client session.
INSERT INTO step101_assert VALUES
('original names restored', (SELECT COUNT(*) FROM jobs) = 6
    AND (SELECT COUNT(*) FROM applications) = 14),
('reconciled copies retained', (SELECT COUNT(*) FROM jobs_reconciled) = 4
    AND (SELECT COUNT(*) FROM applications_reconciled) = 2),
('original legacy names absent', (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name IN ('jobs_legacy_step99','applications_legacy_step99')) = 0),
('renamed constraint follows reconciled jobs', (SELECT COUNT(*) FROM information_schema.key_column_usage
    WHERE table_schema = DATABASE() AND table_name = 'applications_reconciled'
    AND constraint_name = 'fk_step101_application_job' AND referenced_table_name = 'jobs_reconciled') = 1),
('original capacity restored', (SELECT COUNT(*) FROM applications
    WHERE job_id = 1 AND status = 'ACCEPTED') = 10),
('original job and application high water restored', (SELECT AUTO_INCREMENT FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'jobs') = @job_next
    AND (SELECT AUTO_INCREMENT FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'applications') = @app_next),
('journal retained', (SELECT COUNT(*) FROM reconciliation_event) = 14);
SELECT 'REVERSE_OK', COUNT(*) FROM step101_assert;
