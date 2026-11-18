-- Apply after V105_001. This migration adds empty tables without changing prior rows or ID sequences.
CREATE TABLE replacement_requests (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    allocation_id BIGINT NOT NULL,
    absence_id BIGINT NOT NULL,
    work_date DATE NOT NULL,
    requested_at DATETIME(6) NOT NULL,
    absence_marked_at DATETIME(6) NOT NULL,
    cancelled_at DATETIME(6) NULL,
    CONSTRAINT uq_replacement_absence_date UNIQUE (allocation_id, work_date),
    CONSTRAINT uq_replacement_request_date UNIQUE (id, work_date),
    CONSTRAINT fk_replacement_request_allocation FOREIGN KEY (allocation_id) REFERENCES worker_allocations(allocation_id),
    CONSTRAINT fk_replacement_request_absence FOREIGN KEY (absence_id) REFERENCES daily_attendance(attendance_id)
) ENGINE = InnoDB;

CREATE TABLE replacement_offers (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT NOT NULL,
    worker_id BIGINT NOT NULL,
    job_location VARCHAR(255) NOT NULL,
    daily_wage DOUBLE NOT NULL,
    state VARCHAR(16) NOT NULL,
    offered_at DATETIME(6) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    accepted_at DATETIME(6) NULL,
    declined_at DATETIME(6) NULL,
    cancelled_at DATETIME(6) NULL,
    CONSTRAINT uq_replacement_offer_worker UNIQUE (request_id, worker_id),
    CONSTRAINT uq_replacement_offer_identity UNIQUE (id, request_id, worker_id),
    CONSTRAINT fk_replacement_offer_request FOREIGN KEY (request_id) REFERENCES replacement_requests(id),
    CONSTRAINT fk_replacement_offer_worker FOREIGN KEY (worker_id) REFERENCES workers(worker_id),
    CONSTRAINT ck_replacement_offer_state CHECK (state IN ('PENDING','ACCEPTED','DECLINED','CANCELLED','EXPIRED')),
    CONSTRAINT ck_replacement_offer_deadline CHECK (expires_at > offered_at),
    INDEX ix_replacement_worker_offers (worker_id, id)
) ENGINE = InnoDB;

CREATE TABLE replacement_coverage (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    request_id BIGINT NOT NULL,
    offer_id BIGINT NOT NULL,
    worker_id BIGINT NOT NULL,
    work_date DATE NOT NULL,
    attendance_status VARCHAR(16) NULL,
    marked_by_contractor_id BIGINT NULL,
    marked_at DATETIME(6) NULL,
    CONSTRAINT uq_replacement_coverage_request UNIQUE (request_id),
    CONSTRAINT uq_replacement_coverage_offer UNIQUE (offer_id),
    CONSTRAINT uq_replacement_coverage_worker_date UNIQUE (worker_id, work_date),
    CONSTRAINT fk_replacement_coverage_request FOREIGN KEY (request_id, work_date) REFERENCES replacement_requests(id, work_date),
    CONSTRAINT fk_replacement_coverage_offer FOREIGN KEY (offer_id, request_id, worker_id)
        REFERENCES replacement_offers(id, request_id, worker_id),
    CONSTRAINT fk_replacement_coverage_worker FOREIGN KEY (worker_id) REFERENCES workers(worker_id),
    CONSTRAINT fk_replacement_attendance_actor FOREIGN KEY (marked_by_contractor_id) REFERENCES contractors(contractor_id),
    CONSTRAINT ck_replacement_attendance_mark CHECK (
        (attendance_status IS NULL AND marked_by_contractor_id IS NULL AND marked_at IS NULL)
        OR (attendance_status IS NOT NULL AND attendance_status IN ('PRESENT', 'ABSENT')
            AND marked_by_contractor_id IS NOT NULL AND marked_at IS NOT NULL))
) ENGINE = InnoDB;
