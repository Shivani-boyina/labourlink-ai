-- Disposable instance only. These accounts never exist on the live server.
CREATE USER 'step101_runtime'@'localhost' ACCOUNT UNLOCK;
CREATE USER 'step101_history'@'localhost' ACCOUNT UNLOCK;
CREATE USER 'step101_journal'@'localhost' ACCOUNT UNLOCK;

GRANT SELECT, INSERT, UPDATE, DELETE ON labourlinkai_restore_check.jobs
    TO 'step101_runtime'@'localhost';
GRANT SELECT, INSERT, UPDATE, DELETE ON labourlinkai_restore_check.applications
    TO 'step101_runtime'@'localhost';
GRANT SELECT ON labourlinkai_restore_check.jobs_legacy_step99
    TO 'step101_history'@'localhost';
GRANT SELECT ON labourlinkai_restore_check.applications_legacy_step99
    TO 'step101_history'@'localhost';
GRANT SELECT ON labourlinkai_restore_check.reconciliation_event
    TO 'step101_history'@'localhost';
GRANT INSERT ON labourlinkai_restore_check.reconciliation_event
    TO 'step101_journal'@'localhost';
