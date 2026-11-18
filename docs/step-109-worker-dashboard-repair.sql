-- Reviewed repair candidate. Executed on verified scratch only until explicitly approved.
-- This matches the V107_001 view definition. Stop if the view already exists.
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
