-- Apply after reconciliation and both Batch 1 migrations. No data is backfilled.
ALTER TABLE jobs
    ADD COLUMN start_date DATE NULL,
    ADD COLUMN end_date DATE NULL,
    ADD CONSTRAINT ck_job_schedule CHECK (
        (start_date IS NULL AND end_date IS NULL)
        OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date));

CREATE TABLE worker_allocations (
    allocation_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    application_id BIGINT NOT NULL,
    job_id BIGINT NOT NULL,
    worker_id BIGINT NOT NULL,
    contractor_id BIGINT NOT NULL,
    allocated_at DATETIME(6) NOT NULL,
    start_date DATE NULL,
    end_date DATE NULL,
    status VARCHAR(16) NOT NULL,
    CONSTRAINT uq_allocation_application UNIQUE (application_id),
    CONSTRAINT uq_allocation_job_worker UNIQUE (job_id, worker_id),
    CONSTRAINT fk_allocation_application FOREIGN KEY (application_id) REFERENCES applications(application_id) ON DELETE RESTRICT,
    CONSTRAINT fk_allocation_job FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE RESTRICT,
    CONSTRAINT fk_allocation_worker FOREIGN KEY (worker_id) REFERENCES workers(worker_id) ON DELETE RESTRICT,
    CONSTRAINT fk_allocation_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(contractor_id) ON DELETE RESTRICT,
    CONSTRAINT ck_allocation_status CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT ck_allocation_schedule CHECK (
        (start_date IS NULL AND end_date IS NULL)
        OR (start_date IS NOT NULL AND end_date IS NOT NULL AND end_date >= start_date)),
    INDEX ix_allocation_worker (worker_id, allocated_at),
    INDEX ix_allocation_contractor (contractor_id, allocated_at)
) ENGINE = InnoDB;

CREATE TABLE daily_attendance (
    attendance_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    allocation_id BIGINT NOT NULL,
    work_date DATE NOT NULL,
    status VARCHAR(16) NOT NULL,
    marked_by_contractor_id BIGINT NOT NULL,
    marked_at DATETIME(6) NOT NULL,
    CONSTRAINT uq_allocation_work_date UNIQUE (allocation_id, work_date),
    CONSTRAINT fk_attendance_allocation FOREIGN KEY (allocation_id) REFERENCES worker_allocations(allocation_id) ON DELETE RESTRICT,
    CONSTRAINT fk_attendance_actor FOREIGN KEY (marked_by_contractor_id) REFERENCES contractors(contractor_id) ON DELETE RESTRICT,
    CONSTRAINT ck_attendance_status CHECK (status IN ('PRESENT', 'ABSENT', 'PENDING'))
) ENGINE = InnoDB;
