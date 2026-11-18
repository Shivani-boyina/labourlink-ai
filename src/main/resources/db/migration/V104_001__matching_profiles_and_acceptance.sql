-- Apply after the approved reconciled jobs and applications take their active names.
-- Optional fields remain NULL for existing records. No historical dates are backfilled.
ALTER TABLE workers
    ADD COLUMN category VARCHAR(100) NULL,
    ADD COLUMN state VARCHAR(100) NULL,
    ADD COLUMN district VARCHAR(100) NULL;

ALTER TABLE contractors
    ADD COLUMN state VARCHAR(100) NULL,
    ADD COLUMN district VARCHAR(100) NULL;

ALTER TABLE jobs
    ADD COLUMN category VARCHAR(100) NULL,
    ADD COLUMN state VARCHAR(100) NULL,
    ADD COLUMN district VARCHAR(100) NULL;

ALTER TABLE applications
    ADD COLUMN accepted_at DATETIME(6) NULL;
