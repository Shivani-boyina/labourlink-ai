-- Step 101 rehearsal only. Use the verified named-pipe sandbox.
CREATE TEMPORARY TABLE step101_assert (
    assertion_name VARCHAR(100) PRIMARY KEY,
    passed TINYINT NOT NULL CHECK (passed = 1)
);
INSERT INTO step101_assert VALUES
('schema identity', DATABASE() = 'labourlinkai_restore_check'),
('five expected tables', (SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE') = 5),
('jobs baseline', (SELECT COUNT(*) FROM jobs) = 6),
('applications baseline', (SELECT COUNT(*) FROM applications) = 14),
('workers baseline', (SELECT COUNT(*) FROM workers) = 11),
('contractors baseline', (SELECT COUNT(*) FROM contractors) = 8),
('labours baseline', (SELECT COUNT(*) FROM labours) = 3),
('orphan jobs exact', (SELECT GROUP_CONCAT(j.job_id ORDER BY j.job_id)
    FROM jobs j LEFT JOIN contractors c ON c.contractor_id = j.contractor_id
    WHERE c.contractor_id IS NULL AND j.contractor_id = 1) = '1,2'),
('no other orphan jobs', (SELECT COUNT(*) FROM jobs j
    LEFT JOIN contractors c ON c.contractor_id = j.contractor_id WHERE c.contractor_id IS NULL) = 2),
('archived jobs both open', (SELECT COUNT(*) FROM jobs WHERE job_id IN (1,2) AND status = 'OPEN') = 2),
('archived dependency manifest', (SELECT GROUP_CONCAT(application_id ORDER BY application_id)
    FROM applications WHERE job_id IN (1,2)) = '1,2,3,4,5,6,7,8,9,10,11,12'),
('archived applications only on job one', (SELECT COUNT(*) FROM applications WHERE job_id = 1) = 12),
('job one capacity', (SELECT required_workers FROM jobs WHERE job_id = 1) = 10),
('job two capacity', (SELECT required_workers FROM jobs WHERE job_id = 2) = 5),
('accepted manifest', (SELECT GROUP_CONCAT(application_id ORDER BY application_id)
    FROM applications WHERE job_id = 1 AND status = 'ACCEPTED') = '1,2,3,4,5,6,7,8,9,10'),
('duplicate canonical date', (SELECT COUNT(*) FROM applications WHERE
    application_id = 1 AND worker_id = 1 AND application_date = '2026-06-19') = 1),
('duplicate companion', (SELECT COUNT(*) FROM applications WHERE
    application_id = 3 AND worker_id = 1 AND application_date IS NULL) = 1),
('orphan application exact', (SELECT COUNT(*) FROM applications a
    LEFT JOIN workers w ON w.worker_id = a.worker_id
    WHERE w.worker_id IS NULL AND a.application_id = 2 AND a.worker_id = 2) = 1),
('no other orphan applications', (SELECT COUNT(*) FROM applications a
    LEFT JOIN workers w ON w.worker_id = a.worker_id WHERE w.worker_id IS NULL) = 1),
('legacy null statuses', (SELECT COUNT(*) FROM applications
    WHERE application_id IN (11,12) AND status IS NULL) = 2),
('legacy null dates', (SELECT COUNT(*) FROM applications
    WHERE application_id BETWEEN 2 AND 12 AND application_date IS NULL) = 11);
