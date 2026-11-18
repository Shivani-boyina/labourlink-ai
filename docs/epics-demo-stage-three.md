# EPICS demo stage 3 — Allocation guard and seed preview

## Allocation safety

`ApplicationServiceImpl` now locks the worker row and requires `availability == true` before a pending application can be accepted. An unavailable or null-availability worker receives the existing HTTP 409 eligibility conflict. The application stays pending, with no selection timestamp or new allocation. The worker lock prevents an availability change from invalidating that check during the acceptance transaction.

The ownership check and job capacity lock remain in place. Repeat acceptance returns the existing result before eligibility is evaluated again. This preserves existing allocations when a worker later becomes unavailable. The source fix was verified in scratch. The live backend was kept running on its existing build.

The hiring unit regressions cover available and unavailable workers, idempotent repeat acceptance, historical acceptance, unauthorized acceptance, capacity, and closed jobs. The isolated MySQL tests additionally exercise a two-thread race for the final slot, rollback on unavailable acceptance, persisted allocation and application state, and repeat acceptance after the worker becomes unavailable.

The final seven-class run passed **33 tests with zero failures, errors, or skips**. The first broader runs exposed two scratch setup issues: a fixture phone collision and missing correction journal triggers in the backup schema. The final run used unique phones for the new test and the existing trigger definitions on a fresh TCP-disabled scratch instance.

## Proposed jobs

The [preview CSV](../data/epics-demo-jobs-preview.csv) has eight jobs for imported contractor IDs 66–73. It covers farm work, security, electrical service and construction. Starts are 1–10 December 2026, durations are 3–14 days, and wages are ₹600–₹1,250 per day. Durations count both schedule dates. Read-only queries against live profiles verified every row's projected candidate count: 2, 2, 2, 1, 1, 1, 1, 1. These counts use the availability flag, matching location and region, skill, category, minimum experience, and wage. Actual scheduling conflicts and availability can change before applications are made.

From the project root, run the seeder in dry-run mode and save its audit output.

```powershell
python -B scripts/seed_epics_demo_jobs.py --count 8 | Tee-Object stage-three-seed-preview.log
```

The dry run authenticated eight fixture contractors, found no existing keys and proposed eight creations. Mock API tests exercised creation, read-back, reusing a job on rerun, and stopping on stored-field drift. Apply mode requires explicit approval and `--apply`. The default count is one. Stable title keys and per-owner lookup protect reruns, and a local lock serializes apply invocations from this machine. An interrupted batch can be inspected and rerun using the same preview. The API assigns ownership, ID, and status.

No live jobs were seeded. Read-only checks found 211 contractors, 216 workers, 11 jobs, 18 applications, two allocations and one attendance row. Job 1027 remained open and allocation 2 remained active on the 20 November–4 December schedule. Allocation 1 remained completed.

## Feature test coverage

| Feature | Regression or next check |
|---|---|
| Attendance and corrections | The isolated allocation suite covers ownership, future/out-of-schedule dates, correction and worker readback. Production-style follow-up for allocation 2 starts 20 November. Verify same-mark replay and correction history there only when authorized. |
| Replacements | The isolated replacement suite exercises competing offers for an absence, contractor scoping, and separate coverage attendance. |
| Reviews | The isolated review suite exercises correction/review races, append-only journal behavior, and eligibility/rating recomputation. Check the report below for the live schema finding. |
| Analytics | `EmploymentAnalyticsTest` covers the summary logic. The demo-validation endpoint writes a saved run, so it was kept outside the live read-only checks. |
| Job closure | The service rejects accepting a pending worker after closure. A browser or API rehearsal can call `PATCH /jobs/{id}/close` on a scratch job and verify that it leaves open search and rejects new applications. |
| Frontend and error handling | The MVC slice uses isolated request fixtures. After deploying the source fix, check that the applicant panel displays the eligibility conflict, leaves the applicant pending, and leaves the allocation list unchanged. The Stage 2 live browser rehearsal established the baseline for the successful flow. |

The frontend TypeScript check and production build passed. A read-only schema check found that live MySQL lacks both `V107_001` append-only triggers for the attendance correction journal. The trigger-backed review assertions ran in scratch with the existing migration's trigger definitions installed there. Live migrations were left pending.

## ML readiness

The default Spring property is `labourlink.ml.url=http://127.0.0.1:8000`. Override with `LABOURLINK_ML_URL` when Spring starts. The default loopback health request was unreachable. The active Python environment has Uvicorn, pandas and NumPy, but is missing FastAPI, Pydantic, joblib, SciPy and scikit-learn. The repository has the FastAPI entry point and the model and metadata in `ml/models/`. The serialized model records scikit-learn **1.9.1**.

Set up a dedicated runtime and start it from the repository root:

```powershell
python -m venv .venv-ml
.venv-ml/Scripts/python.exe -m pip install fastapi uvicorn pydantic joblib pandas numpy scipy scikit-learn==1.9.1
.venv-ml/Scripts/python.exe -m uvicorn ml.api.main:app --host 127.0.0.1 --port 8000
```

`GET /health` checks that the model loaded. `GET /feature-contract` provides the 16 declared features, fitted categorical vocabulary and model SHA-256. `POST /predict` takes one feature object and `POST /predict-batch` takes an `items` array. Results include the predicted label, match probability and percentage. Verify a real prediction with `MLPredictionClientTest` and `LABOURLINK_ML_TEST_URL=http://127.0.0.1:8000`, then verify a live match reports the model method and a numeric score. The passing mocked ML tests verify client behavior and fallback only. No real prediction was observed in Stage 3.
