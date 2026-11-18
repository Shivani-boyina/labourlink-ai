package com.labourlink.labourlinkai.replacement;

import com.labourlink.labourlinkai.entity.*;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionDTO;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionInput;
import com.labourlink.labourlinkai.repository.*;
import com.labourlink.labourlinkai.service.ContractorService;
import com.labourlink.labourlinkai.service.WorkerService;
import com.labourlink.labourlinkai.service.AttendanceCorrectionJournal;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Objects;

@Service
@Transactional(readOnly = true)
public class ReplacementService {
    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");

    public record Absence(Long allocationId, String jobTitle, String workerName, LocalDate workDate, boolean requestable) {}
    public record Candidate(Long workerId, String workerName, String skill, String location, Integer experience,
                            List<String> reasons) {}
    public record RequestView(Long requestId, Long allocationId, String jobTitle, String absentWorkerName,
                              LocalDate workDate, Instant requestedAt, String state, List<OfferView> offers) {}
    public record OfferView(Long offerId, Long requestId, Long workerId, String workerName, String jobTitle,
                            String jobLocation, Double dailyWage, LocalDate workDate, OfferState state,
                            Instant offeredAt, Instant expiresAt, Instant acceptedAt, Instant declinedAt,
                            Instant cancelledAt, DailyAttendance.Status attendanceStatus, Instant markedAt,
                            Long markedByContractorId) {}

    private record Context(ReplacementRequest request, WorkerAllocation allocation, Job job) {}
    private record Assignment(WorkerAllocation allocation, Job job) {}

    private final ReplacementRequestRepository requests;
    private final ReplacementOfferRepository offers;
    private final ReplacementCoverageRepository coverage;
    private final WorkerAllocationRepository allocations;
    private final DailyAttendanceRepository attendance;
    private final JobRepository jobs;
    private final WorkerRepository workerRecords;
    private final ContractorService contractors;
    private final WorkerService workers;
    private final JdbcTemplate jdbc;
    private final AttendanceCorrectionJournal corrections;

    public ReplacementService(ReplacementRequestRepository requests, ReplacementOfferRepository offers,
                              ReplacementCoverageRepository coverage, WorkerAllocationRepository allocations,
                              DailyAttendanceRepository attendance, JobRepository jobs, WorkerRepository workerRecords,
                              ContractorService contractors, WorkerService workers, JdbcTemplate jdbc,
                              AttendanceCorrectionJournal corrections) {
        this.requests = requests;
        this.offers = offers;
        this.coverage = coverage;
        this.allocations = allocations;
        this.attendance = attendance;
        this.jobs = jobs;
        this.workerRecords = workerRecords;
        this.contractors = contractors;
        this.workers = workers;
        this.jdbc = jdbc;
        this.corrections = corrections;
    }

    public List<Absence> absences(String phone) {
        Long owner = contractorId(phone);
        return jdbc.query("""
                SELECT a.allocation_id, j.title, w.name, d.work_date,
                    CASE WHEN a.status = 'ACTIVE' AND d.work_date = ?
                              AND d.work_date BETWEEN a.start_date AND a.end_date
                              AND d.work_date BETWEEN j.start_date AND j.end_date
                              AND r.id IS NULL THEN 1 ELSE 0 END AS requestable
                FROM daily_attendance d JOIN worker_allocations a ON a.allocation_id = d.allocation_id
                JOIN jobs j ON j.job_id = a.job_id JOIN workers w ON w.worker_id = a.worker_id
                LEFT JOIN replacement_requests r ON r.allocation_id = a.allocation_id AND r.work_date = d.work_date
                WHERE a.contractor_id = ? AND j.contractor_id = ? AND d.status = 'ABSENT'
                ORDER BY d.work_date DESC, a.allocation_id
                """, (row, index) -> new Absence(row.getLong(1), row.getString(2), row.getString(3),
                row.getObject(4, LocalDate.class), row.getBoolean(5)), today(), owner, owner);
    }

    public List<RequestView> contractorRequests(String phone) {
        Long owner = contractorId(phone);
        List<Long> ids = jdbc.query("""
                SELECT r.id FROM replacement_requests r JOIN worker_allocations a ON a.allocation_id = r.allocation_id
                JOIN jobs j ON j.job_id = a.job_id WHERE a.contractor_id = ? AND j.contractor_id = ?
                ORDER BY r.work_date DESC, r.id DESC
                """, (row, index) -> row.getLong(1), owner, owner);
        return ids.stream().map(id -> requestView(context(id, false))).toList();
    }

    public List<OfferView> workerOffers(String phone) {
        Long workerId = workerId(phone);
        return offers.findByWorkerIdOrderByIdDesc(workerId).stream()
                .map(offer -> offerView(context(offer.requestId, false), offer)).toList();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RequestView create(String phone, Long allocationId, LocalDate date) {
        Assignment assignment = assignment(allocationId, true);
        WorkerAllocation allocation = assignment.allocation;
        Job job = assignment.job;
        requireOwner(allocation, job, contractorId(phone));
        var existing = requests.findByAllocationIdAndWorkDate(allocationId, date);
        if (existing.isPresent()) return requestView(new Context(existing.get(), allocation, job));
        DailyAttendance absent = verifyAbsence(allocation, job, date);
        ReplacementRequest request = requests.save(new ReplacementRequest(allocationId, absent.getAttendanceId(),
                date, now(), absent.getMarkedAt()));
        return requestView(new Context(request, allocation, job));
    }

    public List<Candidate> recommendations(String phone, Long requestId) {
        Context ctx = contractorContext(phone, requestId, false);
        requireOpen(ctx);
        String requiredSkill = ctx.job.getRequiredSkill();
        if (requiredSkill == null || requiredSkill.isBlank()) return List.of();
        List<String> reasons = ctx.job.getMinimumExperience() != null && ctx.job.getMinimumExperience() > 0
                ? List.of("SKILL", "LOCATION", "EXPERIENCE", "WAGE", "AVAILABLE")
                : List.of("SKILL", "LOCATION", "WAGE", "AVAILABLE");
        return workerRecords.findBySkillIgnoreCase(requiredSkill).stream()
                .filter(worker -> eligible(ctx, worker))
                .filter(worker -> !offers.existsByRequestIdAndWorkerId(ctx.request.id, worker.getWorkerId()))
                .map(worker -> new Candidate(worker.getWorkerId(), worker.getName(), worker.getSkill(),
                        worker.getLocation(), worker.getExperience(), reasons))
                .toList();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OfferView send(String phone, Long requestId, Long targetWorkerId) {
        Context ctx = contractorContext(phone, requestId, true);
        requireOpen(ctx);
        Worker worker = workerRecords.findById(targetWorkerId).orElseThrow(() -> new IllegalStateException("Worker not found"));
        if (!eligible(ctx, worker)) throw new IllegalStateException("Worker is not eligible for this coverage date");
        if (offers.existsByRequestIdAndWorkerId(requestId, targetWorkerId)) {
            throw new IllegalStateException("This worker already received an offer for this request");
        }
        Instant deadline = ctx.request.workDate.plusDays(1).atStartOfDay(ZONE).toInstant();
        Instant sentAt = now();
        if (!sentAt.isBefore(deadline)) throw new IllegalStateException("Coverage date has passed");
        return offerView(ctx, offers.save(new ReplacementOffer(requestId, targetWorkerId,
                ctx.job.getLocation(), ctx.job.getWagePerDay(), sentAt, deadline)));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OfferView respond(String phone, Long offerId, boolean accept) {
        Long workerId = workerId(phone);
        ReplacementOffer hint = offer(offerId);
        requireWorker(hint, workerId);
        Context ctx = context(hint.requestId, true);
        // Resolve after locking without reusing a pre-lock offer snapshot.
        refresh(hint);
        requireWorker(hint, workerId);
        OfferState decision = accept ? OfferState.ACCEPTED : OfferState.DECLINED;
        if (hint.state == decision) return offerView(ctx, hint);
        requirePending(hint);
        if (!accept) {
            hint.state = OfferState.DECLINED;
            hint.declinedAt = now();
            return offerView(ctx, hint);
        }
        requireOpen(ctx);
        if (!same(ctx.job.getLocation(), hint.jobLocation) || !Objects.equals(ctx.job.getWagePerDay(), hint.dailyWage)) {
            throw new IllegalStateException("Job location or wage changed after this offer");
        }
        Worker worker = workerRecords.findForUpdate(workerId).orElseThrow(() -> new IllegalStateException("Worker not found"));
        entityManager.refresh(worker);
        if (!eligible(ctx, worker)) throw new IllegalStateException("Worker is no longer eligible for this coverage date");
        requirePending(hint);
        Instant acceptedAt = now();
        hint.state = OfferState.ACCEPTED;
        hint.acceptedAt = acceptedAt;
        coverage.save(new ReplacementCoverage(ctx.request.id, hint.id, workerId, ctx.request.workDate));
        offers.findByRequestIdOrderById(ctx.request.id).stream()
                .filter(other -> !other.id.equals(hint.id) && effectiveState(other, acceptedAt) == OfferState.PENDING)
                .forEach(other -> cancel(other, acceptedAt));
        return offerView(ctx, hint);
    }

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    private void refresh(ReplacementOffer offer) {
        entityManager.refresh(offer);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OfferView cancelOffer(String phone, Long requestId, Long offerId) {
        Context ctx = contractorContext(phone, requestId, true);
        ReplacementOffer offer = offer(offerId);
        if (!offer.requestId.equals(requestId)) throw new IllegalStateException("Offer not found for this request");
        if (offer.state == OfferState.CANCELLED) return offerView(ctx, offer);
        requirePending(offer);
        cancel(offer, now());
        return offerView(ctx, offer);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public RequestView cancelRequest(String phone, Long requestId) {
        Context ctx = contractorContext(phone, requestId, true);
        if (coverage.findByRequestId(requestId).isPresent()) throw new IllegalStateException("Coverage is already confirmed");
        if (ctx.request.cancelledAt == null) {
            Instant cancelledAt = now();
            ctx.request.cancelledAt = cancelledAt;
            offers.findByRequestIdOrderById(requestId).stream()
                    .filter(offer -> effectiveState(offer, cancelledAt) == OfferState.PENDING)
                    .forEach(offer -> cancel(offer, cancelledAt));
        }
        return requestView(ctx);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OfferView mark(String phone, Long requestId, LocalDate date, DailyAttendance.Status status) {
        Long owner = contractorId(phone);
        Context ctx = context(requestId, true);
        requireOwner(ctx.allocation, ctx.job, owner);
        ReplacementCoverage confirmed = coverage.findByRequestId(requestId)
                .orElseThrow(() -> new IllegalStateException("Replacement coverage is not confirmed"));
        if (!confirmed.workDate.equals(date) || date.isAfter(today()) || status == null) {
            throw new IllegalArgumentException("Attendance date must be the confirmed coverage date");
        }
        if (status == DailyAttendance.Status.PENDING) {
            throw new IllegalArgumentException("Mark the replacement PRESENT or ABSENT");
        }
        if (confirmed.attendanceStatus != null && confirmed.attendanceStatus != status) {
            throw new IllegalStateException("Replacement attendance has already been recorded");
        }
        if (confirmed.attendanceStatus == null) {
            confirmed.attendanceStatus = status;
            confirmed.markedAt = now();
            confirmed.markedByContractorId = owner;
        }
        return offerView(ctx, offer(confirmed.offerId));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OfferView correctAttendance(String phone, Long requestId, LocalDate date, AttendanceCorrectionInput input) {
        Long owner = contractorId(phone);
        Context ctx = context(requestId, true);
        requireOwner(ctx.allocation, ctx.job, owner);
        ReplacementCoverage confirmed = recordedCoverage(requestId, date);
        if (input.status() == DailyAttendance.Status.PENDING) {
            throw new IllegalArgumentException("Mark the replacement PRESENT or ABSENT");
        }
        confirmed.markedAt = corrections.append(null, confirmed.id, date, confirmed.attendanceStatus,
                confirmed.markedByContractorId, confirmed.markedAt, owner, input);
        confirmed.attendanceStatus = input.status();
        confirmed.markedByContractorId = owner;
        return offerView(ctx, offer(confirmed.offerId));
    }

    public List<AttendanceCorrectionDTO> attendanceCorrections(String phone, Long requestId, LocalDate date) {
        contractorContext(phone, requestId, false);
        return corrections.forCoverage(recordedCoverage(requestId, date).id);
    }

    private ReplacementCoverage recordedCoverage(Long requestId, LocalDate date) {
        return coverage.findByRequestId(requestId)
                .filter(row -> row.workDate.equals(date) && !date.isAfter(today()) && row.attendanceStatus != null)
                .orElseThrow(() -> new IllegalStateException("Recorded replacement attendance not found for this coverage date"));
    }

    private Context contractorContext(String phone, Long requestId, boolean lock) {
        Long owner = contractorId(phone);
        Context ctx = context(requestId, lock);
        requireOwner(ctx.allocation, ctx.job, owner);
        return ctx;
    }

    private Context context(Long id, boolean lock) {
        ReplacementRequest request = requests.findById(id).orElseThrow(() -> new IllegalStateException("Replacement request not found"));
        Assignment assignment = assignment(request.allocationId, lock);
        if (lock) entityManager.refresh(request);
        return new Context(request, assignment.allocation, assignment.job);
    }

    private DailyAttendance verifyAbsence(WorkerAllocation allocation, Job job, LocalDate date) {
        if (date == null || date.isBefore(today()) || allocation.getStatus() != WorkerAllocation.Status.ACTIVE
                || !within(date, allocation.getStartDate(), allocation.getEndDate())
                || !within(date, job.getStartDate(), job.getEndDate())) {
            throw new IllegalStateException("Coverage needs an active allocation and a confirmed job schedule for today");
        }
        return attendance.findByAllocationIdAndWorkDate(allocation.getAllocationId(), date)
                .filter(row -> row.getStatus() == DailyAttendance.Status.ABSENT)
                .orElseThrow(() -> new IllegalStateException("Coverage requires verified ABSENT attendance"));
    }

    private void requireOpen(Context ctx) {
        if (ctx.request.cancelledAt != null) throw new IllegalStateException("Replacement request is cancelled");
        if (coverage.findByRequestId(ctx.request.id).isPresent()) throw new IllegalStateException("Coverage is already confirmed");
        verifyAbsence(ctx.allocation, ctx.job, ctx.request.workDate);
    }

    private boolean eligible(Context ctx, Worker worker) {
        Job job = ctx.job;
        return !Objects.equals(worker.getWorkerId(), ctx.allocation.getWorkerId())
                && Boolean.TRUE.equals(worker.getAvailability())
                && same(job.getRequiredSkill(), worker.getSkill()) && same(job.getLocation(), worker.getLocation())
                && (job.getState() == null || same(job.getState(), worker.getState()))
                && (job.getDistrict() == null || same(job.getDistrict(), worker.getDistrict()))
                && (job.getMinimumExperience() == null || job.getMinimumExperience() == 0
                    || (worker.getExperience() != null && worker.getExperience() >= job.getMinimumExperience()))
                && worker.getExpectedWagePerDay() != null && job.getWagePerDay() != null
                && worker.getExpectedWagePerDay() <= job.getWagePerDay()
                && allocations.countConflictsOn(worker.getWorkerId(), ctx.request.workDate) == 0
                && !coverage.existsByWorkerIdAndWorkDate(worker.getWorkerId(), ctx.request.workDate);
    }

    private RequestView requestView(Context ctx) {
        String state = ctx.request.cancelledAt != null ? "CANCELLED" :
                coverage.findByRequestId(ctx.request.id).isPresent() ? "CONFIRMED" :
                ctx.request.workDate.isBefore(today()) ? "EXPIRED" : "OPEN";
        Worker absent = workerRecords.findById(ctx.allocation.getWorkerId())
                .orElseThrow(() -> new IllegalStateException("Worker not found"));
        return new RequestView(ctx.request.id, ctx.allocation.getAllocationId(), ctx.job.getTitle(), absent.getName(),
                ctx.request.workDate, ctx.request.requestedAt, state,
                offers.findByRequestIdOrderById(ctx.request.id).stream().map(offer -> offerView(ctx, offer)).toList());
    }

    private OfferView offerView(Context ctx, ReplacementOffer offer) {
        var mark = offer.state == OfferState.ACCEPTED ? coverage.findByRequestId(ctx.request.id).orElse(null) : null;
        String name = workerRecords.findById(offer.workerId).map(Worker::getName).orElse(null);
        return new OfferView(offer.id, offer.requestId, offer.workerId, name, ctx.job.getTitle(),
                offer.jobLocation, offer.dailyWage, ctx.request.workDate, effectiveState(offer, now()),
                offer.offeredAt, offer.expiresAt, offer.acceptedAt, offer.declinedAt, offer.cancelledAt,
                mark == null ? null : mark.attendanceStatus, mark == null ? null : mark.markedAt,
                mark == null ? null : mark.markedByContractorId);
    }

    private Job job(Long id) { return jobs.findById(id).orElseThrow(() -> new IllegalStateException("Job not found")); }
    private ReplacementOffer offer(Long id) { return offers.findById(id).orElseThrow(() -> new IllegalStateException("Replacement offer not found")); }
    private Assignment assignment(Long id, boolean lock) {
        if (!lock) {
            WorkerAllocation allocation = allocations.findById(id)
                    .orElseThrow(() -> new IllegalStateException("Allocation not found"));
            return new Assignment(allocation, job(allocation.getJobId()));
        }
        Long jobId = allocations.findJobId(id).orElseThrow(() -> new IllegalStateException("Allocation not found"));
        Job job = jobs.findByIdForUpdate(jobId).orElseThrow(() -> new IllegalStateException("Job not found"));
        WorkerAllocation allocation = allocations.findForUpdate(id)
                .orElseThrow(() -> new IllegalStateException("Allocation not found"));
        return new Assignment(allocation, job);
    }
    private Long workerId(String phone) { return workers.getWorkerByPhone(phone).getWorkerId(); }
    private Long contractorId(String phone) { return contractors.getContractorByPhone(phone).getContractorId(); }

    private static void requireOwner(WorkerAllocation allocation, Job job, Long owner) {
        if (!owner.equals(allocation.getContractorId()) || !owner.equals(job.getContractorId())) {
            throw new IllegalStateException("Access denied: You do not own this replacement request");
        }
    }
    private static void requireWorker(ReplacementOffer offer, Long workerId) {
        if (!workerId.equals(offer.workerId)) throw new IllegalStateException("Access denied: This offer belongs to another worker");
    }
    private static void requirePending(ReplacementOffer offer) {
        OfferState effective = effectiveState(offer, now());
        if (effective != OfferState.PENDING) throw new IllegalStateException("Offer is no longer pending (" + effective + ")");
    }
    private static OfferState effectiveState(ReplacementOffer offer, Instant at) {
        return offer.state == OfferState.PENDING && !at.isBefore(offer.expiresAt) ? OfferState.EXPIRED : offer.state;
    }
    private static void cancel(ReplacementOffer offer, Instant at) {
        offer.state = OfferState.CANCELLED;
        offer.cancelledAt = at;
    }
    private static boolean within(LocalDate value, LocalDate start, LocalDate end) {
        return start != null && end != null && !value.isBefore(start) && !value.isAfter(end);
    }
    private static boolean same(String left, String right) {
        return left != null && !left.isBlank() && right != null && left.strip().equalsIgnoreCase(right.strip());
    }
    static LocalDate today() { return LocalDate.now(ZONE); }
    private static Instant now() { return Instant.now().truncatedTo(ChronoUnit.MICROS); }
}
