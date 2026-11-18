# LabourLink AI — Post-Merge Stabilization Report

## Scope

Stabilized role-based navigation and the worker/contractor job and application flows after the Varshini changes were merged into the project baseline. Work is on `codex/post-merge-stabilization`, based on `main` at `ca3cb1b` when this branch was created. No push or merge has been performed.

## Changes made

- Added role-aware navigation, guest-only registration routes, role-specific login redirects, and persistent English/Telugu language selection.
- Added a worker applications page and route, and connected job details to application status and outcomes.
- Updated contractor job/applicant pages to use translated labels and the current authenticated contractor's profile/search APIs.
- Restricted worker-directory access and legacy labour endpoints by role. Job and application operations derive identity from the authenticated principal and enforce ownership.
- Added request validation and consistent API error responses. Application capacity/status updates use database row locks, and job deletion is rejected when applications exist.
- Expanded workflow/security test coverage and made test phone numbers unique. Test fixtures no longer perform blanket repository cleanup.

## Verification

- Frontend production build: **passed** (`npm run build`).
- Backend and test-source compilation: **passed** (`mvn -DskipTests test-compile`). No database connection or test execution occurred in this command.
- Locale key scan: **passed**, no missing referenced keys in English or Telugu.
- `git diff --check`: **passed**. No merge conflict markers were found in tracked project source (generated/dependency directories excluded).
- `.env` remains ignored by Git; no credentials were added to the report or source changes.

## Runtime verification still needed

Database-backed integration tests were not run. Automatic approval review rejected running them against the application's configured MySQL database because the suite can mutate or delete persistent project data, and disabling schema updates/using transaction rollback was not considered sufficient evidence of safety. Do not run the suite against a shared or user-data database. To complete runtime verification, configure and explicitly authorize a disposable test database/schema, then run the integration suite there.

## Manual smoke checklist

1. Register/login as a worker and confirm redirects, dashboard, job search/details, applying once, and the My Applications list.
2. Register/login as a contractor and confirm own job listing, job creation, worker search, applicant review, accept/reject, and capacity enforcement.
3. Confirm workers cannot access contractor-only worker-directory APIs or contractor pages, and contractors cannot read worker-only application endpoints.
4. Confirm one account cannot read or change another contractor's jobs/applicants, or another worker's profile/applications.
5. Switch English/Telugu, reload, and confirm the selected locale remains active across both role portals.
6. Confirm public job search exposes only open jobs and registration pages redirect authenticated users to their own portal.

## Schema and deployment notes

No schema recreation or migration was performed. Runtime database behavior, lock semantics against the project's MySQL version, and the manual workflows above remain to be verified in a disposable test environment before deployment.

## Test isolation follow-up

- Added `src/test/resources/application-test.properties`, which obtains its datasource exclusively from `TEST_DB_URL`, `TEST_DB_USERNAME`, and `TEST_DB_PASSWORD`; its Hibernate schema mode is `create-drop`. The regular application properties were not changed.
- All three `@SpringBootTest` classes activate the `test` profile and install `TestDatabaseSafetyInitializer`. Before context startup it requires the active `test` profile, all three test datasource settings, and a MySQL JDBC URL whose database component is exactly `labourlinkai_test`. It rejects a missing or differently named database before datasource creation.
- Test classes were inspected for destructive cleanup. There are no `@After` cleanup routines, blanket repository deletes, `TRUNCATE`, or explicit `DROP`/database recreation operations. Test fixtures create unique records inside transactional tests; Hibernate schema generation is confined to the test profile and thus the guarded disposable database.
- The formerly permissive application workflow checks now require exact responses: duplicate application **409**, capacity full **409**, unauthorized applicant listing **403**, and another contractor's job deletion **403**. The existing exception handler already maps duplicate and capacity conflicts to **409** and ownership failures to **403**; no business logic change was needed. Role-based unauthorized job deletion remains **403**.
- Test and production source compilation passed with tests skipped. Tests were **not executed**. `TEST_DB_URL`, `TEST_DB_USERNAME`, and `TEST_DB_PASSWORD` are currently absent from this environment, so no effective JDBC URL is available to report. Redacted expected URL shape: `jdbc:mysql://<host>:<port>/labourlinkai_test[?options]`. The code guard and configuration demonstrate fail-closed isolation, but actual environment/database isolation cannot be verified until those test-only variables are configured. No connection was made to `labourlinkai` or `labourlinkai_test`.

## Continued workflow and dataset work

- Added contractor-only job edit and close endpoints; editable job fields preserve the principal-derived owner and current status. Closed job details are returned only to their owning contractor.
- Worker dashboard now shows exact skill/location matches, all open jobs, and recent application statuses. Contractor dashboard now includes job states and applicant/match counts.
- Replaced the browser-only exact-match section with worker-only `/jobs/recommendations/me`: unavailable workers are filtered; OPEN jobs with remaining capacity are ranked with an explainable score (skill 40, location 25, experience 15, expected-wage fit 20). Missing expected wage earns no wage-fit points. The dashboard keeps this separate from all open jobs.
- Added nullable job minimum-experience and duration, plus optional worker expected daily wage. These model changes are additive and will be reflected by existing Hibernate `update` behavior on application startup; no database was connected, so generated DDL and existing MySQL schema compatibility remain unverified.
- Contractor applicant cards now include location, availability, expected daily wage, contact, skill, experience and status. Dashboard totals refresh after accept/reject. The 3-position allocation test represents two accepts, one rejection, one remaining position, a further acceptance, and a final capacity rejection; compile-only passed, execution is blocked by the missing isolated DB configuration.
- Added registration-to-login, edit/close ownership, closed-job privacy, reject-capacity, and worker-status-denial integration assertions. They compile but remain unexecuted until test DB configuration is verified.
- Production frontend build and Maven compile-only passed. Browser sample-mode smoke verified guest route redirection, Telugu persistence, and sample job browsing; it did not reach the backend.
- Created complete audit, UI restoration, integration test, and dataset readiness reports under `docs/`. No dataset source was downloaded and no records were fabricated. The repository contains no workbook or dataset files.
- See `docs/INTEGRATION_TEST_REPORT.md` for commands, scope, and blockers. No GitHub push has been made because the runtime verification gate is not yet satisfied.
