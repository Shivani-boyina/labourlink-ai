-- Apply only to the approved database after taking a schema-only backup.
-- The existing V107_001 definitions are reproduced here for an already-created table.
CREATE TRIGGER IF NOT EXISTS reject_attendance_correction_update
BEFORE UPDATE ON attendance_corrections
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attendance correction history is append-only';

CREATE TRIGGER IF NOT EXISTS reject_attendance_correction_delete
BEFORE DELETE ON attendance_corrections
FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Attendance correction history is append-only';

SELECT TRIGGER_NAME, EVENT_OBJECT_TABLE, ACTION_TIMING, EVENT_MANIPULATION, ACTION_STATEMENT
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = DATABASE()
  AND TRIGGER_NAME IN ('reject_attendance_correction_update', 'reject_attendance_correction_delete')
ORDER BY TRIGGER_NAME;
