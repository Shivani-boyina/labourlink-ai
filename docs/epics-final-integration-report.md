# LabourLink AI final integration report

## Database and deployment

The 18 November 2026 read-only MySQL checks found **216 workers, 211 contractors, 11 jobs, 18 applications, two allocations, and one attendance row**. Application 30 remains ACCEPTED for worker 1193 and job 1027. Allocation 2 remains ACTIVE under contractor 64. Legacy contractors 9 and 11 remain present. No live jobs, applications, allocations, reviews, or attendance rows were created in this pass. The removed import was never used. Database-backed automated tests used a fresh schema-only copy with independent fixtures.

The original FastAPI model service was started on port 8000. The changed Spring code was verified on a temporary read-only backend. The pre-existing backend on port 8080 continues serving its previous build. See the [execution guide](epics-demo-execution-guide.md) for bringing up the current source.

## Changes

| File | Change |
|---|---|
| `JobServiceImpl.java`, `WorkerMatchingService.java`, `JobSearchDTO.java` | Worker recommendations now share the contractor-side eligibility and schedule filters, exclude expired and full jobs, and return the validated model score or structured rules fallback. |
| `WorkerDashboard.tsx`, `jobService.ts` | Compact opportunity ring, today and recommendation counts, top three matches, job details and application actions. The score is the best eligible result. Undated jobs count in recommendations but do not count toward scheduled work today. |
| `ContractorDashboard.tsx` | Per-job match count replaces the repeated aggregate count on each card. The overview deduplicates eligible, hired, scheduled-today and completed workers. Open-job recommendations show the leading model score when available. |
| English and Telugu `translation.json` | Localized the new dashboard cards and application feedback. |
| `ml/requirements.txt` | Reproduces the runtime used to load the existing joblib model. |
| `ApplicationWorkflowTest.java`, `IsolatedMatchingMySqlTest.java` | Replaced hard-coded archive data dependencies with test fixtures and added a MySQL regression for worker eligibility, real scoring and post-allocation exclusion. |

The [eight-job preview](../data/epics-demo-jobs-preview.csv) and [idempotent seeder](../scripts/seed_epics_demo_jobs.py) from Stage 3 use current worker profiles and imported contractor accounts. Bulk apply remains pending approval.

## API and regression evidence

| Area | Result |
|---|---|
| Backend suite | 69 tests passed on the final run, with zero failures, errors or skips. Initial archive failures were traced to tests assuming a specific pre-existing worker and archive row. The isolated fixtures now supply both. |
| Registration, login and authorization | Scratch authentication and application tests passed. Existing worker and contractor logins were verified against the live service. |
| Job posting, search and closure | Scratch job and closure tests passed. Live `GET /jobs/search` with Tile Fitter, Bhimavaram and an exact ₹800 wage returned job 1027. |
| Applications, rejection and acceptance | Scratch workflow and MVC tests passed. Live MySQL verified the approved application and allocation link. |
| Capacity, duplicates and availability | Unit and isolated MySQL checks passed, including concurrent acceptance for the final slot. |
| Attendance and correction | Isolated MySQL tests passed with append-only journal triggers installed in scratch. Live worker attendance for allocation 2 returned HTTP 200 with no marks. Its valid schedule starts 20 November. |
| Replacements and reviews | Isolated MySQL suites passed. The live review endpoint returned HTTP 200 with an empty result for worker 1193. |
| Archive | The live worker archive returned HTTP 200 with an empty list. Scratch tests verified a grant reveals history only to its original worker. The previously reported live error did not reproduce. |
| Analytics | Employment analytics unit assertions passed. |
| ML | Java-to-FastAPI prediction returned **92.55%** on a fixture, and the real MySQL-backed matching test returned **88.98%**. Model hash was unchanged. The live job 1027 contractor match used `RULE_BASED / FEATURES_UNAVAILABLE` with the service healthy. The model scores its learned fit label. |
| TypeScript and build | Both passed. |
| Browser and localization | Headless Chrome verified the worker dashboard at desktop width and in Telugu at 390 pixels, with no horizontal overflow. It verified contractor overview values, the accepted applicant panel, allocation 2, and empty attendance. The final run asserted that the browser requested the candidate API on port 8081. An earlier browser run reached the old service and was discarded. |

## Dashboard screenshots

Screenshots show the relevant panels with account details outside the captured region. The worker panel reports one recommendation and zero jobs scheduled today. The contractor panel reports one eligible worker, one hired worker, zero scheduled today, and zero workers with completed work for this contractor.

![Worker opportunity summary](epics-dashboard-screenshots/worker-opportunities.png)

![Contractor employment overview](epics-dashboard-screenshots/contractor-employment.png)

![Telugu worker opportunity summary at mobile width](epics-dashboard-screenshots/worker-opportunities-telugu-mobile.png)

## Remaining limitations

- Live MySQL still lacks the two append-only attendance correction triggers. Installing them requires a separately approved migration.
- Full mutation workflows ran on isolated fixtures. Live attendance remains empty for allocation 2 because its schedule has yet to start.
- The eligibility and availability code changes take effect on the current source build after the demo backend is restarted.

## Deployment readiness check

The 18 November 2026 [deployment runbook](epics-deployment-runbook.md) records the startup command, checksum, cutover gates, rollback procedure, and post-cutover smoke checks.

| Area | Result |
|---|---|
| Port 8080 | Existing Java PID 15368 remained running and served `GET /jobs` with HTTP 200. |
| Port 8081 | The checksum-pinned executable JAR returned HTTP 200 in read-only mode. It was stopped after the checks. |
| Port 8000 | Uvicorn PID 13476 returned HTTP 200 from model health. Live job 1027 returned rule-based fallback because the worker category and worker/job locations and districts were outside the fitted vocabulary. |
| Rollback readiness | The old JVM uses an exploded classpath. Its classes on disk were overwritten by later compilation. No exact previous executable was found in the project artifact search, so the old JVM remains running and cutover is on hold. |
| Attendance journal | Five relevant table definitions were backed up without rows. On a TCP-disabled scratch database, the trigger-only script ran twice with the same two definitions. Both isolated review tests passed. Live still had no journal triggers. |
| Seed preview | All eight proposed jobs and contractor logins passed the read-only dry run. Current matching profile counts were **2, 2, 2, 1, 1, 1, 1, 1**. No jobs were inserted. |
| Frontend and screenshots | The running Vite frontend on 5173 was verified to target 8080. The screenshots above were refreshed with Chrome connected explicitly to the packaged read-only JAR on 8081. The worker recommendation and fallback, Telugu at 390 pixels, contractor metrics, accepted application and empty attendance all passed. |

Artifacts and logs are in `target/epics-deployment-20261118/`. The post-cutover smoke test is pending the approved deployment. Live data remains at 216 workers, 211 contractors, 11 jobs, 18 applications, two allocations, and one attendance row.

## Final localhost preview

The independent [localhost preview](http://localhost:3000) runs the checksum-pinned JAR at `http://localhost:8081` against the configured live MySQL schema. The original backend on 8080 and frontend on 5173 passed the initial checks. Their final status is recorded below. No existing frontend traffic was switched.

- **PASS:** The 69-test backend suite was rerun against a fresh TCP-disabled schema-only instance. TypeScript and the production build for the 8081 preview passed. Candidate and previous-backend smoke tests passed against the two actual listeners.
- **PASS:** FastAPI on port 8000 loaded the original model and reproduced the 92.55% test prediction. The current job 1027 recommendation reports clearly labeled rules fallback for unsupported features. Separate Spring/MySQL integration fixtures exercised real model scoring.
- **PASS:** Chrome verified both dashboards against 8081, including the worker ring, one recommendation and zero jobs scheduled today, the accepted applicant, allocation 2 and its empty attendance view. Telugu at 390 pixels had no horizontal overflow. The screenshots above were refreshed from this preview.
- **PASS:** The separate release-browser test passed all **10 workflow groups** on isolated MySQL, with zero failed or skipped. Chrome submitted the registration, job, application, approval, attendance, correction, review, and replacement forms. It also verified authorization, archive visibility, English and Telugu navigation, loading, unsupported model features, and a simulated inference outage through a separate ML process. The scratch bundle and operational logs passed credential-canary checks. The test restored the separately launched preview on 3000 afterward. Allocation completion and closed-job behavior were exercised in the backend suite.
- **PASS:** Backup checksums and the eight-job data review passed again. The seeder dry run against 8081 proposed eight jobs and made no inserts.
- **PASS:** The final live Chrome run checked View Job and Apply controls, worker applications and archives, the worker's allocation and empty attendance and review views, and contractor matching, replacement and review eligibility. The tested pages had no uncaught JavaScript errors.
- **FAIL:** The original listeners on 8080 and 5173 were unreachable at the final check, and their original PIDs and parents were gone. Cause was not established. The release commands did not target those processes for shutdown. The previously rehearsed fallback requires the old JVM and is unavailable. The independent preview and ML service remained healthy.
- **PENDING:** Production hosting, original frontend traffic switch, the journal trigger migration, and bulk seeding. Direct replacement on 8080 remains blocked by the unavailable previous executable. Live allocation 2 starts 20 November, so no live attendance or review was written.

See [startup and restart commands](LOCALHOST-FINAL-STARTUP.md), the [public deployment checklist](PRODUCTION-DEPLOYMENT-CHECKLIST.md), and the [side-by-side rollback procedure](epics-deployment-runbook.md).

This pass added the startup and checklist documents, updated this report, the deployment runbook and the demo execution guide, and refreshed three dashboard screenshots. No new application defect was reproduced in the successful release checks, so the tested JAR was kept intact.
