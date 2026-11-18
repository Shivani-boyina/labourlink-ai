# EPICS deployment preparation

## Backend cutover and rollback

The versioned candidate is `target/epics-deployment-20261118/labourlinkai-epics-verified-20261118.jar`. Its SHA-256 is `1E1F4EB22390FBDE6C5F764599D4515FAB6DFD34F3A49395BDAD036065D69706`. Keep the release directory when cleaning Maven outputs. The [launcher](../scripts/deployment/start-backend-release.ps1) checks the hash, verifies the configured DB points to local MySQL port 3307, requires an unoccupied application port, uses Hibernate schema validation and disables Spring's SQL initialization.

**Port 8080 cutover is on hold.** The older Maven-launched JVM, PID 15368, uses an argument file pointing to `target/classes`. The active process started before those files were recompiled. Its launch metadata confirms the classpath, but the files now on disk cannot reproduce its earlier build.

The recovery search covered project output, deployment and team archives, Git commits, the safety tag and stash, local Maven artifacts, and backup directories. The cache held a June JAR, and the November 14 project archive held compiled classes. Both lacked allocation, replacement, archive and model-scoring classes exposed by the running application. The November 16 nested build has those classes, but lacks `AnalyticsController`. The running application returned HTTP 200 from `/analytics/validation/latest`, and its JVM points at the outer project directory. The Git tag is a pre-merge safety tag. Database backups do not contain a verified application binary. The exact earlier build was not recovered from these sources. Preserve the running JVM while obtaining an independently identified previous executable. Current or older source trees without provenance cannot establish a rollback build.

After the previous artifact has been recovered and the cutover approved:

1. Save the candidate JAR, previous artifact and both checksums in separate versioned locations. Rehearse the previous artifact on a free port in read-only mode and record its baseline.
2. Verify MySQL counts, job 1027, accepted application 30, and allocations 1 and 2. Check ML health at 8000. Identify the live 8080 listener and stop its owning application gracefully during the approved window.
3. Start the candidate on 8080 with the checksum-pinned launcher from the project root. The launcher runs in the foreground.

   ```powershell
   $jar = 'target/epics-deployment-20261118/labourlinkai-epics-verified-20261118.jar'
   $sha = (Get-Content "$jar.sha256" -Raw).Trim()
   ./scripts/deployment/start-backend-release.ps1 -Jar $jar -SHA256 $sha -Port 8080
   ```

4. In a separate shell, confirm frontend requests use 8080 and run the automatic check.

   ```powershell
   python -B scripts/deployment/smoke_backend_release.py --port 8080 --expect candidate
   ```

   On a failure, stop only the candidate during the approved window, then use the rehearsed previous JAR and its independently stored checksum.

   ```powershell
   ./scripts/deployment/start-backend-release.ps1 -Jar $previousJar -SHA256 $previousSHA256 -Port 8080
   ```

   In a separate shell, run the baseline smoke.

   ```powershell
   python -B scripts/deployment/smoke_backend_release.py --port 8080 --expect previous
   ```

   Database recovery is separate from application rollback. This release uses the existing schema, and no removed dataset is required.

## Side-by-side alternative

Keep the previous JVM on 8080 and run the candidate on 8081. After separate approval, direct a separate frontend instance to 8081 with `VITE_API_BASE_URL=http://localhost:8081` and `VITE_USE_MOCK_DATA=false`. For rollback, send clients back to the original frontend on 5173, which targets 8080. If using one frontend instance, restore `VITE_API_BASE_URL=http://localhost:8080` and restart or rebuild that frontend so the value takes effect. Then run the previous-build smoke command above.

On 18 November, a temporary read-only router on loopback port 8082 served the original 8080 API, switched to the release JAR on 8081, and switched back to 8080. The automatic smoke passed at each stage. It confirmed the recommendation payload changed with the route, then returned to the previous contract on the same PID 15368. Health, original model hash and a real 92.55% prediction passed each time. The test router and temporary candidate were stopped afterward. Evidence is in `target/epics-deployment-20261118/routing-rollback-rehearsal.log`. This was an API traffic restoration test with live services and read-only requests.

This strategy depends on the old JVM surviving. It cannot restart that JVM if it exits, and the candidate serves on 8081. A direct replacement on 8080 remains gated on a verified previous executable. The candidate rehearsal used `-ReadOnly`. Drop that switch only after approval of the side-by-side deployment.

## Backup and service checks

The candidate SHA-256 and five-table schema backup SHA-256 were rechecked. FastAPI on port 8000 returned HTTP 200 and loaded the pinned model. The original full and protected-worker backups still match their recorded checksums, and the original verification report documents their isolated restore. They predate the current approved demo relationships. The later `C:/FinalEpicsProject/database-backups/labourlinkai_before_duplicate_cleanup_20261118_074930.sql` exists, with SHA-256 `D305EB0F0EF1FEB50F560AE148C66924D2E1EF4E4B8A33ED47C0D33F347ABEEF`. That later file was not restore-tested in this pass. Existing dumps are recovery evidence and are outside the backend rollout.

## Attendance journal guards

The schema-only backup is `target/epics-deployment-20261118/attendance-journal-schema-before.sql`. It covers `attendance_corrections`, `daily_attendance`, `replacement_coverage`, `contractors`, and `worker_allocations`. SHA-256 is `4AC65C61ADE881D30C4F2D0AE7ABFFC96DEAF5F9ED9DCBC28FFABCEC7264F22C`.

The [trigger-only migration](../scripts/deployment/attendance-journal-guards.sql) uses the existing V107_001 definitions and leaves any matching existing triggers in place. Do not run V107_001 wholesale against the existing tables.

The current live schema still has all five required tables and neither attendance journal guard. No live migration was executed.

The scratch rehearsal executed the trigger file twice with identical final definitions, then passed both isolated review tests, including write rejection for correction history. Dropping the two scratch triggers restored the original inventory of zero guards. This confirms the trigger-only rollback on scratch.

After live migration approval:

1. Recheck the backup checksum. Confirm database `labourlinkai`, port 3307, table existence, row counts, and trigger names and definitions. Save the pre-run trigger inventory. If either name is already taken by a different trigger, stop. MySQL has binary logging enabled and `log_bin_trust_function_creators=0`. Use an authorized account with the required trigger and binlog privileges. Keep the global settings as they are.
2. Run only the trigger SQL through the MySQL client. DDL commits separately, so record each trigger that appears after execution. The file's verification query must show two `BEFORE` triggers on `attendance_corrections`: one `UPDATE` and one `DELETE`. Each action must signal SQLSTATE `45000` with the append-only message.
3. Recheck the journal and related table counts. Use the isolated behavioral tests for the write probes. Use live attendance retrieval as a non-mutating health check.
4. If trigger rollback is separately approved, use `DROP TRIGGER IF EXISTS labourlinkai.<trigger_name>` only for triggers absent in the saved pre-run inventory and created by this deployment. Check the final inventory against the saved inventory. The schema-only dump provides reference definitions. A trigger-only rollback does not require dropping or restoring tables.

## Post-cutover checks

- Check `GET /jobs` and the filtered search for job 1027, log in through the approved local contractor and worker accounts, and confirm role scoping.
- As worker 1124, check `GET /jobs/recommendations/me` returns job 1027 and a labeled recommendation method. Confirm English and Telugu dashboard rendering while the frontend is configured to call port 8080.
- As worker 1193 or contractor 64, check application 30 and allocation 2. Check attendance retrieval without marking a row. Confirm counts and legacy contractor IDs against the baseline.
- Verify FastAPI `GET /health`, the feature contract and a real prediction with `MLPredictionClientTest`. A live recommendation may still use rules if the input is outside the original model vocabulary.
- Run the [job preview](../data/epics-demo-jobs-preview.csv) through the dry-run seeder again if data changed during the maintenance window. Bulk insertion has its own approval.

## Eight-job readiness

The dry run authenticated owners 66–73 and reported eight proposed creations. Read-only MySQL checks verified one intended owner per row, no existing demo title keys across the entire jobs table, start dates after 18 November 2026, and inclusive schedule durations. Availability, skill, location, category, region, experience and wage checks found **2, 2, 2, 1, 1, 1, 1, 1** qualifying workers, matching the proposed slot counts. Job insertion remains pending approval. The dry-run audit is in `target/epics-deployment-20261118/seed-readiness-recheck.log`.

The final live check found 216 workers, 211 contractors, 11 jobs, and two allocations. Application 30 remains accepted. Allocation 1 is completed and allocation 2 is active. The original process still owns 8080, ML still owns 8000, and the rehearsal ports 8081 and 8082 were released.

## Localhost preview handoff

The next release pass started the verified JAR on 8081 and a separate Vite frontend on 3000. The original JVM on 8080, frontend on 5173, and ML on 8000 stayed in service. The Vite preview identifies 8081 as its API origin. The baseline and candidate runs are in `target/epics-deployment-20261118/localhost-smoke-8080.log` and `localhost-smoke-8081.log`. For the demo use the [localhost startup guide](LOCALHOST-FINAL-STARTUP.md). The incompatible-model-feature fallback for job 1027 is expected, and the real model test passes.

Live frontend routing, trigger migration, and job seeding remain separate approvals. Direct 8080 cutover remains blocked because there is no exact restartable rollback artifact.

The independent preview is available for manual verification. The 69-case backend suite and the separate 10-group browser release rehearsal passed on schema-only scratch instances. The browser rehearsal used a separate inference process for an outage test and restored the preview frontend on port 3000.

**Final process check:** The original Java PID 15368 and Vite PID 1304, and both of their recorded parent processes, were gone when checked. Both original services passed at the start of the release pass. Their exit cause is unverified. The release commands targeted only the independent preview frontend during the scratch browser rehearsal. No original process was targeted for shutdown, restarted or replaced. The final healthy listeners were 3000, 8081 and 8000. The previous routing rollback requires the old JVM and is now unavailable. Do not route users to 8080 or 5173 until an approved service is running there. The absence of a listener does not authorize cutover.
