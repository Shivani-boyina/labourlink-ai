-- Isolated rehearsal only. Reversal assumes no operational writes after cutover.
-- Keep the reconciliation journal and reconciled copies for inspection.
RENAME TABLE applications TO applications_reconciled,
             applications_legacy_step99 TO applications,
             jobs TO jobs_reconciled,
             jobs_legacy_step99 TO jobs;
