# LabourLink AI EPICS demonstration

## Start services

Use the [final localhost startup guide](LOCALHOST-FINAL-STARTUP.md) to run the updated frontend on port 3000 and backend on port 8081 against the configured database. The original service can remain on 8080. The demonstration starts with job 1027, application 30, and allocation 2. Account credentials are available locally in the approved configuration and registration files. Use the navigation language selector to switch between English and Telugu.

## Demonstrate existing records

1. Sign in as worker 1124 for an example of a matching opportunity. Job 1027 is a tile-fitting job in Bhimavaram. The dashboard shows the best matching score, opportunities scheduled today, and recommended jobs. Use **View Job** to inspect the posting. **Apply** submits a real application.
2. Sign in as worker 1193 to show accepted application 30, allocation 2, and the scheduled attendance view. The archived section is expected to be empty for this account.
3. Sign in as contractor 64 and open the employment overview, job 1027, its worker matches, and the applicant panel. Application 30 is already accepted. In Allocations, select allocation 2. Its schedule is 20 November–4 December 2026 and attendance is initially empty. Mark attendance only for work actually performed on a permitted date.
4. Explain that a match score measures fit and that a scheduled worker count comes from dated active allocations. Contractor selection and recorded attendance are separate steps.
5. The original model can score supported feature combinations. A current job can still use rules if its inputs fall outside the trained vocabulary. The dashboard labels that fallback.

## Verify and review the seed preview

```powershell
python -B scripts/seed_epics_demo_jobs.py --count 8
```

The [preview](../data/epics-demo-jobs-preview.csv) proposes eight jobs based on current worker profiles. This command is read-only. Bulk creation requires approval of the preview.

For real client prediction checks, set `LABOURLINK_ML_TEST_URL=http://127.0.0.1:8000` and run `MLPredictionClientTest`. For new applications, allocation edge cases, attendance corrections, replacements and reviews, use the [isolated test workflow](batch-1-isolated-testing.md) with a schema-only scratch database and test fixtures.
