# EPICS demo, single-job checkpoint

Live target on 18 November 2026 was the existing Spring Boot service on port 8080 and MySQL `labourlinkai` on port 3307. The initial inventory was 211 contractors, 216 workers, 10 jobs and one allocation. It included 200 imported contractors, and legacy contractor IDs 9 and 11 still shared a phone. The only successful write in this stage was job 1027.

## Implementation plan

1. Use the existing React `CreateJob` form and `jobService` contract. The backend enforces contractor role on `POST /jobs`, validates the `Job` fields and sets ownership, status and ID server-side. Verify one API-created job before testing a browser submission or adding a batch.
2. Verify matching through `GET /jobs/{id}/matches` and worker recommendations through `GET /jobs/recommendations/me`. Compare eligibility with saved profiles and report prediction fallback separately.
3. After approval, use the existing worker application and contractor hiring workflow. A worker submits to `POST /applications`. The contractor reviews `GET /applications/job/{jobId}` and uses `PUT /applications/{id}/status` for the acceptance transition. Check the allocation through the role-specific `/allocations` endpoints and views, then test duplicate, ownership and capacity constraints.
4. Reuse the existing browser release rehearsal and isolated MySQL tests for applications, allocations, attendance, corrections, replacements and reviews. Use the analytics and auth tests for their respective workflows, then exercise both frontend locales. Run destructive scenarios only against isolated fixtures.

## Observed results

| Feature | Check | Result | Evidence or issue |
|---|---|---|---|
| Contractor and worker login | Authenticated with existing CSV accounts | PASS | Both returned HTTP 200. The contractor was ID 64. |
| Job authorization | Anonymous and worker POST requests | PASS | HTTP 401 and 403 respectively. |
| Job form contract | Contractor POST with zero wage | PASS | HTTP 400. |
| Job creation | One valid contractor POST, authenticated GET and direct MySQL read | PASS | Job 1027, owner 64, status OPEN. The job is for two tile fitters in Bhimavaram at ₹800/day. |
| Safe rerun | Reran the single-job script with creation enabled | PASS | Reused job 1027. Exactly one row matched the title. |
| Worker matching | Owner matching API and MySQL eligibility count | PASS | Two API matches and two qualifying database profiles. |
| Worker recommendations | Existing eligible worker fetched recommendations | PASS | Job 1027 was present. |
| ML scoring | Matching API with prediction enabled | FALLBACK | Both matches used `RULE_BASED` with `MODEL_UNAVAILABLE`. |
| Frontend | TypeScript check | PASS | `npm.cmd run typecheck` passed. Browser form testing is pending. |
| Allocation, attendance, replacements, reviews, analytics and localization | Reviewed implementation and existing test entry points | PENDING | No workflow writes were made at this checkpoint. |

The first smoke run incorrectly expected a top-level job ID in the worker recommendation response. The script was corrected to read the nested `job.jobId` field, and the rerun passed using the existing job. No application code fix was needed.

Jobs increased from 10 to 11. Contractor, worker and allocation counts stayed at 211, 216 and one. One contractor was used and two workers matched. No workers were allocated.

## Reproduce

Run `python -B scripts/smoke_demo_job.py` from the project root to verify the existing demo job. The script reads local account CSVs and prints only test outcomes. The explicit `--create` option creates this one job if its title is absent from the authenticated contractor's job list. Run `npm.cmd run typecheck` from the frontend directory.
