-- Isolated rehearsal only. Keep the original tables intact.
RENAME TABLE jobs TO jobs_legacy_step99,
             jobs_reconciled TO jobs,
             applications TO applications_legacy_step99,
             applications_reconciled TO applications;
