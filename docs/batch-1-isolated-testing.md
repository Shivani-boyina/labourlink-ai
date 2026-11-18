# Batch 1 isolated testing

Run the targeted `HiringSelectionUnitTest` and `BatchOneWebTest` classes.
The service tests use mocks and the MVC slice does not start JPA or a datasource.
The frontend has TypeScript and Vite build scripts and no configured test runner.

The Step 105 test initializer supersedes the old TCP and `create-drop` setup.
The database test classes require a verified local named pipe and use Hibernate
`ddl-auto=validate`. The initializer fails before Spring creates its datasource
if the named pipe, schema, scratch data directory, executable or server identity
is unexpected.

For database acceptance, restore the verified backup into a fresh MySQL 9.7
scratch instance with a unique named pipe and TCP and MySQL X disabled.
Prove process ID, executable, resolved data directory, and server identity
before restoring or migrating. Rehearse Step 101's forward cutover there.
Run V104_001, set `@approved_reconciliation_batch = 'step101-rehearsal'`
in the same SQL session as V104_002, then run V104_002. These scripts are
versioned SQL, with no automatic migration runner configured in this project.
Review the resulting schema before any application deployment.

For the current suite, also apply V105_001, V106_001 and V107_001 in the
scratch schema. Create the scratch-only account `step105_test@localhost` with SELECT, INSERT, UPDATE
and DELETE on `labourlinkai_restore_check` and no DDL grants. The scratch account
is local to the independently verified, TCP-disabled process. Set
`LABOURLINK_BATCH105_PIPE` to that run's generated pipe name and select
`IsolatedAllocationMySqlTest`, `IsolatedReplacementMySqlTest`, `IsolatedReviewMySqlTest`,
`ApplicationWorkflowTest`, `AuthControllerTest`
and `LabourlinkaiApplicationTests`. Use a fresh restore per run. The allocation
tests create fixture records in scratch, so they require an uncontaminated
fixture namespace. Shut down the scratch server after the tests.

Grant the runtime account only SELECT on the two archive projection tables.
Leave access grants empty until an authorized operator verifies account
ownership and approves specific application-to-worker links. Workers never
gain archived access solely because a legacy numeric ID matches their account.

## Corrections and review eligibility

The owning contractor can correct a previously recorded mark within its
verified work dates, including after allocation completion. The client supplies
the last observed marking timestamp and a reason. A job lock serializes the
correction and review eligibility check. The correction changes the current
mark and inserts a journal event in the same transaction. MySQL blocks journal
updates and deletes. Contractor history includes reasons for their own
engagements. Worker history and rating summaries omit correction reasons.
Existing replacement requests, offers, and coverage remain in history.

A review belongs to a contractor, worker, and job. Permanent and replacement
attendance can both establish eligibility for that engagement. Review creation
saves the qualifying source and date, and an edit revalidates current presence.
If the last qualifying PRESENT mark is corrected away, the review remains
visible to its participants but contributes neither a rating nor a count.
It becomes eligible again when there is a qualifying PRESENT mark. Ratings
display an unknown average with count zero when there are no qualifying reviews.

## Original model matching

Start FastAPI with the existing ML virtual environment and the original model
on a dedicated loopback port. Set `LABOURLINK_ML_TEST_URL` to that URL for
`MLPredictionClientTest` and `LABOURLINK_ML_URL` to the same URL for the
Spring matching test. Include `IsolatedMatchingMySqlTest` and `MLMatchingTest`
in the regression run. Step 108 adds no database migration. Compare both
model artifact hashes before and after the run.

The training audit defines the monthly inputs as jobs given to the worker in
the reference month and a yes/no flag derived from that count. The app counts
distinct jobs using recorded permanent allocation timestamps in the
Asia/Kolkata calendar month. A later cancellation does not undo an allocation
event. Temporary replacement coverage is tracked separately. An unresolved
legacy acceptance makes the worker's monthly features unknown whenever it
could affect the count.

The HTTP contract exposes the fitted categorical vocabulary. Matching
canonicalizes case and surrounding whitespace for known categories and uses
rules when a value is outside that vocabulary. A genuine zero eligible
review count permits a null rating, which the shipped pipeline supports.
The model predicts its training match label. It does not estimate the
probability of a successful hire.
