# Step 109 release runbook

## Repeat the isolated browser gate

Use the verified Windows named-pipe MySQL target described in the isolated
testing runbook. In addition to the normal test account, create the
scratch-only `release_browser_runtime@localhost` account with the candidate
runtime grants below. Apply reconciliation and V104–V107, and start a
dedicated loopback FastAPI service. For the outage check, the scratch FastAPI
wrapper should return HTTP 503 from `/predict` while the
`fastapi-unavailable` file exists in the scratch run directory.

Set `LABOURLINK_RELEASE_BROWSER=true`, `LABOURLINK_RELEASE_RUN` to the verified
scratch run directory, and the MySQL pipe and ML test variables from the
isolated testing runbook. Include `ReleaseRehearsalBrowserTest` in the Maven
suite. It starts Spring Boot on a random loopback port, builds React with
mock data disabled, and uses a private headless Chrome profile. Confirm
the test ran with zero skips. Its fixture records are confined to scratch.

## Before approval

- Freeze the reviewed Git tree and identify the Spring Boot package, React
  bundle, FastAPI package, migration bundle, and original model and metadata
  checksums. Preserve the existing uncommitted work until the release contents
  have been reviewed and captured in a release revision.
- Verify the deployment manifest contains the approved Step 99 reconciliation
  decisions. Recount dependencies and compare statuses, dates, row counts,
  definitions, and AUTO_INCREMENT values. Stop for any drift that would change
  which records are archived.
- Confirm the maintenance window, responsible operator, independent verifier,
  go/no-go owner, monitoring access, and recovery storage. Verify adequate
  space for the live snapshot, forward copies and scratch replay.
- Obtain separate approval for the live backup and restore verification, write
  pause, migration execution, role changes, and deployment. Archive access
  grants need explicit approval for each verified application-to-worker link.
  Leave grants empty when identity cannot be verified.

## Migration and deployment sequence

1. Pause writes and background workers and drain in-flight transactions.
   Confirm the live connection identity without recording credentials. Take a
   fresh consistent logical snapshot and checksum it. Verify recovery in a
   separate MySQL instance and capture source and restored baseline inventories.
2. Run the reviewed Approach A reconciliation. Prepare and validate the active
   copies and reconciliation journal against the exact approved live manifest.
   Review the final SQL as a release artifact. The Step 101 files contain
   scratch-only guards, accounts, and rehearsal labels. Keep those out of
   production execution. In a single reviewed rename, preserve the originals
   under legacy names and publish the constrained copies as jobs and
   applications. Verify restrictive foreign keys, active worker/job uniqueness,
   archive fingerprints, counts, and ID high-water marks.
3. Apply V104_001, then apply V104_002 using the approved production batch
   identifier in the same SQL session. Apply V105_001, V106_001, and V107_001 in
   that order. Verify allocation, attendance, correction and review counts
   start at zero unless the approved manifest explicitly reports otherwise.
   Verify the correction journal triggers and review-evidence view.
4. Verify the candidate account grants. Use separate non-DDL runtime and
   migration accounts. Grant the runtime account only the required table
   operations, INSERT and SELECT for the correction journal, and SELECT for
   the archive projection, archive-access table, and verified-work view.
   Deny the runtime account access to raw legacy tables and mutations of
   archive grants and audit history. Establish an independently authorized
   operation for any individual access grant.
5. Start FastAPI privately, validate health and the feature contract against
   the original model and metadata hashes, then smoke-test a known input.
   Start Spring Boot with `ddl-auto=validate` and the approved runtime account.
   Confirm auth, role boundaries, migrations, and archived history checks.
   Publish the React build last with the approved API origin and mock data
   disabled. Smoke-test the critical browser workflows and the localized UI.
   The current CORS allowlist covers local development origins. For release,
   verify an approved production origin or a compatible same-origin ingress.
   Reopen writes only after approval of those checks.
6. Monitor login and authorization results, unexpected HTTP 4xx/5xx rates,
   database locks and capacity conflicts, migration errors, attendance and
   review write failures, and model timeout/fallback rate. Alert on archive
   access failures and verify service logs and bundles do not expose secrets.

## Rollback decision

- Before writes resume, keep the write pause in place and preserve any
  failed-state snapshot. Use the verified pre-cutover backup in a
  separately verified restore target if the baseline must be restored.
  Validate exact DDL, rows and ID high-water marks before pointing a
  compatible previous application package at it. The baseline restore
  removes the additive schema from the rollback target.
- After writes resume, first pause writes again and take and checksum a full
  post-cutover snapshot. Capture and inventory new or changed jobs,
  applications, accounts and all new hiring, attendance, replacement,
  correction and review records. The pre-cutover snapshot lacks those
  changes. Step 101's reverse rename alone also leaves post-cutover
  writes in the reconciled copies and is insufficient once later foreign
  keys and tables exist. Prefer a forward fix unless a replay or compatible
  migration can be rehearsed without losing records or audit provenance.
- A post-write rollback requires explicit approval of the data-preservation
  procedure and any unavoidable gaps. Never silently point the application
  at a pre-cutover schema while it is missing accepted writes.
