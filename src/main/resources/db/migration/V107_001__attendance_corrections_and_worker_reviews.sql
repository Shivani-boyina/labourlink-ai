-- Apply after V106_001. No corrections, reviews, or ratings are backfilled.
CREATE TABLE attendance_corrections (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    attendance_id BIGINT NULL,
    coverage_id BIGINT NULL,
    work_date DATE NOT NULL,
    previous_status VARCHAR(16) NOT NULL,
    new_status VARCHAR(16) NOT NULL,
    reason VARCHAR(500) NOT NULL,
    previous_actor_id BIGINT NOT NULL,
    previous_marked_at DATETIME(6) NOT NULL,
    contractor_id BIGINT NOT NULL,
    corrected_at DATETIME(6) NOT NULL,
    CONSTRAINT ck_correction_source CHECK ((attendance_id IS NULL) <> (coverage_id IS NULL)),
    CONSTRAINT ck_correction_reason CHECK (CHAR_LENGTH(TRIM(reason)) BETWEEN 12 AND 500),
    CONSTRAINT ck_correction_change CHECK (
        previous_status IN ('PRESENT','ABSENT','PENDING') AND new_status IN ('PRESENT','ABSENT','PENDING')
        AND previous_status <> new_status AND corrected_at > previous_marked_at),
    CONSTRAINT fk_correction_attendance FOREIGN KEY (attendance_id) REFERENCES daily_attendance(attendance_id),
    CONSTRAINT fk_correction_coverage FOREIGN KEY (coverage_id) REFERENCES replacement_coverage(id),
    CONSTRAINT fk_correction_previous_actor FOREIGN KEY (previous_actor_id) REFERENCES contractors(contractor_id),
    CONSTRAINT fk_correction_actor FOREIGN KEY (contractor_id) REFERENCES contractors(contractor_id),
    INDEX ix_correction_attendance (attendance_id, id),
    INDEX ix_correction_coverage (coverage_id, id)
) ENGINE = InnoDB;

CREATE TRIGGER reject_attendance_correction_update BEFORE UPDATE ON attendance_corrections
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attendance correction history is append-only';

CREATE TRIGGER reject_attendance_correction_delete BEFORE DELETE ON attendance_corrections
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attendance correction history is append-only';

CREATE TABLE worker_reviews (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    job_id BIGINT NOT NULL,
    worker_id BIGINT NOT NULL,
    contractor_id BIGINT NOT NULL,
    rating INT NOT NULL,
    feedback VARCHAR(1000) NULL,
    evidence_date DATE NOT NULL,
    attendance_id BIGINT NULL,
    coverage_id BIGINT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uq_worker_review_engagement UNIQUE (job_id, worker_id, contractor_id),
    CONSTRAINT ck_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ck_review_evidence CHECK ((attendance_id IS NULL) <> (coverage_id IS NULL)),
    CONSTRAINT fk_review_job FOREIGN KEY (job_id) REFERENCES jobs(job_id),
    CONSTRAINT fk_review_worker FOREIGN KEY (worker_id) REFERENCES workers(worker_id),
    CONSTRAINT fk_review_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(contractor_id),
    CONSTRAINT fk_review_attendance FOREIGN KEY (attendance_id) REFERENCES daily_attendance(attendance_id),
    CONSTRAINT fk_review_coverage FOREIGN KEY (coverage_id) REFERENCES replacement_coverage(id),
    INDEX ix_review_worker (worker_id, created_at),
    INDEX ix_review_contractor (contractor_id, job_id)
) ENGINE = InnoDB;

-- A review remains stored if a correction removes its evidence. Rating queries require
-- at least one currently verified PRESENT record for the same job/worker/contractor.
CREATE SQL SECURITY INVOKER VIEW verified_worker_engagements AS
SELECT a.job_id, a.worker_id, a.contractor_id, d.work_date AS evidence_date,
       d.attendance_id, NULL AS coverage_id
FROM daily_attendance d
JOIN worker_allocations a ON a.allocation_id = d.allocation_id
JOIN jobs j ON j.job_id = a.job_id AND j.contractor_id = a.contractor_id
WHERE d.status = 'PRESENT' AND d.marked_by_contractor_id = a.contractor_id
  AND d.work_date BETWEEN a.start_date AND a.end_date
UNION ALL
SELECT a.job_id, c.worker_id, a.contractor_id, c.work_date, NULL, c.id
FROM replacement_coverage c
JOIN replacement_offers o ON o.id = c.offer_id AND o.state = 'ACCEPTED' AND o.accepted_at IS NOT NULL
JOIN replacement_requests r ON r.id = c.request_id
JOIN worker_allocations a ON a.allocation_id = r.allocation_id
JOIN jobs j ON j.job_id = a.job_id AND j.contractor_id = a.contractor_id
WHERE c.attendance_status = 'PRESENT' AND c.marked_by_contractor_id = a.contractor_id;
