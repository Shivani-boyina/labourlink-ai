# LabourLink AI — Workflow Implementation Report

**Date:** 2026-11-13
**Branch:** `codex/post-merge-stabilization`
**Base:** `0e7ac1d`

## Original problem and root causes

- Workers could browse open jobs, but dashboard recommendations used an exact browser-side skill/location filter and did not account for availability, experience requirements, or wage expectations.
- Job records had no minimum experience or duration fields; worker profiles had no expected daily wage field.
- Contractor applicants were visible and accept/reject actions existed, but applicant cards omitted location, availability, and expected wage. Dashboard allocation totals did not refresh after an action.
- The backend already authenticated roles, derived applying worker identity from JWT, checked job ownership for applicant/status operations, and serialized capacity checks on job rows. Those controls are retained.

## Implementation

- Added nullable job minimum-experience/duration and worker expected-daily-wage properties. These are additive fields; the preexisting Hibernate `update` behavior may add nullable columns at startup. No database was connected, so DDL has not been observed or applied in this work.
- Added worker-only `GET /jobs/recommendations/me`. It filters out unavailable workers, non-open/full jobs, returns an explainable 0–100 score using skill (40), exact location (25), experience (15), and wage fit (20), and sorts highest first. Missing expected wage contributes zero wage points. The worker dashboard now separates recommendations from all open jobs and displays the score.
- Job create/edit captures optional minimum experience and duration. Job details show them when present.
- Applicant responses now include worker location, availability, and optional expected daily wage; contractor cards display those fields with status and actions. Accept/reject refreshes contractor allocation metrics.
- Added isolated integration scenarios for the rule score and five applicants to a three-position job: accept two, reject one, verify one remaining place, accept another worker, then ensure an additional acceptance is rejected at capacity. They compile but have not been executed.
- Existing ownership, pending-only transition, duplicate-application and row-lock capacity behavior remains in place.

## Changed files

### Backend

- `src/main/java/com/labourlink/labourlinkai/entity/Job.java`
- `src/main/java/com/labourlink/labourlinkai/entity/Worker.java`
- `src/main/java/com/labourlink/labourlinkai/dto/ApplicationResponseDTO.java`
- `src/main/java/com/labourlink/labourlinkai/controller/JobController.java`
- `src/main/java/com/labourlink/labourlinkai/security/SecurityConfig.java`
- `src/main/java/com/labourlink/labourlinkai/service/JobService.java`
- `src/main/java/com/labourlink/labourlinkai/service/JobServiceImpl.java`
- `src/main/java/com/labourlink/labourlinkai/service/ApplicationServiceImpl.java`
- `src/test/java/com/labourlink/labourlinkai/application/ApplicationWorkflowTest.java`

### Frontend

- `labourlink-ai-frontend/src/types/Job.ts`, `Worker.ts`
- `labourlink-ai-frontend/src/services/jobService.ts`, `applicationService.ts`
- `labourlink-ai-frontend/src/pages/WorkerDashboard.tsx`, `ContractorDashboard.tsx`, `CreateJob.tsx`, `WorkerRegister.tsx`, `JobDetails.tsx`
- `labourlink-ai-frontend/src/i18n/locales/en/translation.json`, `te/translation.json`

## Verification and blockers

| Item | Status |
|---|---|
| Backend and test-source compile | **PASS** — `./mvnw.cmd -DskipTests test-compile`; no tests or datasource started |
| Frontend production build | **PASS** — `npm run build` (TypeScript and Vite production bundle) |
| Workflow integration tests | **BLOCKED** — `TEST_DB_URL`, `TEST_DB_USERNAME`, and `TEST_DB_PASSWORD` were absent at the last check; tests must not run until `labourlinkai_test` isolation is demonstrated |
| MySQL schema update | **NOT VERIFIED** — no database connection was made |
| Worker browse/apply flow | **IMPLEMENTED BUT NOT VERIFIED** against live backend |
| Contractor applicant/decision/capacity flow | **IMPLEMENTED BUT NOT VERIFIED** against live backend |
| Authentication and protected routes | Existing assertions and route protections retained; **live workflow not verified** |
| Dataset readiness | Schema/source/feature plan documented in `docs/DATASET_DEVELOPMENT_READINESS.md`; no records collected |
| Git commit and push | **NOT STARTED** — no commit or push; `main` remains untouched |

No database credentials, passwords, or tokens were added to tracked files. Remaining manual checks include the 3-worker allocation scenario, live authentication/session flow, mobile layout/accessibility, and review of generated additive DDL in a disposable database.
