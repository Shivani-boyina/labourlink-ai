# EPICS demo stage 2 — Application, allocation and attendance checkpoint

On 18 November 2026, the approved live workflow reused job **1027** and contractor **64**. Worker **1193** submitted application **30**. The contractor accepted it and the application service created allocation **2**. Worker 1124 appeared in the read-only matching results and submitted no application. No attendance ID was created. Job 1027 has two positions, one of which is occupied.

## Application architecture

- `ApplicationController` exposes `POST /applications`, `GET /applications/my`, `GET /applications/job/{jobId}`, and `PUT /applications/{id}/status`. `ApplicationServiceImpl` derives identity from the authenticated principal. It uses `WorkerRepository`, `ContractorRepository`, `JobRepository`, and `ApplicationRepository` over the `Worker`, `Contractor`, `Job`, and `Application` entities. A job must be open with capacity to receive an application, and each worker may apply once. Only the owner can accept or reject a pending application. Capacity is checked again under the job lock at acceptance.
- Acceptance persists the `ACCEPTED` status and creates the `WorkerAllocation` through `AllocationService` in the same transaction. The allocation starts `ACTIVE` and inherits the job schedule. The service makes repeated acceptance idempotent. `AllocationController` serves role-specific allocation lists and contractor schedule and status updates. Allocation states are `ACTIVE`, `COMPLETED`, and `CANCELLED`.
- `AllocationService` uses `WorkerAllocationRepository` and `DailyAttendanceRepository`. `PUT /allocations/contractor/{id}/attendance/{date}` identifies the worker and job through the allocation. It requires the owning contractor, an active allocation, a confirmed schedule, and a date within that schedule through the current India date. Resubmitting the same status returns the existing row. Changing a recorded status requires the correction endpoint. Both roles can read their own allocation's attendance.
- Matching uses `WorkerMatchingService` for skill, location, experience, availability, and schedule conflicts. The live acceptance method checks that the applicant exists and capacity remains. It does not independently recheck the worker's availability flag. This run used an available worker and did not exercise an unavailable-worker acceptance.

## Live API and database evidence

| Operation | Endpoint | Result | Evidence |
|---|---|---|---|
| Contractor logins | `POST /auth/login` | PASS, 200 twice | Owner 64 and a separate contractor for authorization checks |
| Worker login | `POST /auth/worker/login` | PASS, 200 | Worker 1193 |
| Job details and matches | `GET /jobs/1027`, `GET /jobs/1027/matches?includePrediction=false` | PASS, 200 each | Open job, two slots, candidate IDs 1124 and 1193 |
| Applicant list and access control | `GET /applications/job/1027` | PASS, 200 owner and 403 non-owner | Owner could inspect applicants |
| Application creation and protections | `POST /applications` | PASS, 200 worker, 409 duplicate, 401 anonymous, 403 contractor | Exactly one application, ID 30, returned PENDING |
| Worker application retrieval | `GET /applications/my` | PASS, 200 | Application 30 visible to worker 1193 |
| Owner approval, repeat approval and role checks | `PUT /applications/30/status?status=ACCEPTED` | PASS, 200 twice as owner, 403 worker, 403 non-owner | Final status ACCEPTED, one allocation |
| Allocation retrieval | `GET /allocations/contractor`, `GET /allocations/worker` | PASS, 200 each | Both returned the same allocation 2 |
| Attendance retrieval and access control | `GET /allocations/contractor/2/attendance`, `GET /allocations/worker/2/attendance` | PASS, 200 for both owners, 403 non-owner contractor | No marks for allocation 2 |

Independent MySQL reads confirmed application 30 linked worker 1193 to job 1027. Allocation 2 linked application 30 to contractor 64, worker 1193, and job 1027. It is ACTIVE with dates 20 November–4 December 2026. Existing allocation 1 for job 24 remains COMPLETED. Counts are 216 workers, 211 contractors, 11 jobs, two allocations and one attendance record. The attendance record belongs to the pre-existing workflow.

## Frontend and remaining checks

- TypeScript check and production build passed. Private headless Chrome verified contractor login and dashboard, the accepted applicant badge, job details, match rendering, and allocation 2 with “No attendance marks yet.” The first browser pass used case-sensitive text for the uppercase status badge. The corrected assertion passed.
- Attendance mutation, invalid-date submission, duplicate marking, and display of a persisted mark remain pending. All dates on allocation 2 are in the future as of 18 November. The first valid attendance date is 20 November 2026. The schedule was left intact.
- The run observed one occupied slot out of two. Capacity rejection at saturation, the application rejection transition, and allocation status mutations were outside the one-application live scope. The frontend approval button itself was not submitted because the API had already completed the approved transition.
- Results include 21 passing live HTTP checks, two passing build checks, and five passing browser check groups on rerun. No application code changed. No protected worker or legacy contractor profile was edited. No extra job or allocation was created.
