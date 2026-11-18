package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.dto.AllocationDTO;
import com.labourlink.labourlinkai.dto.AttendanceDTO;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionDTO;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionInput;
import com.labourlink.labourlinkai.entity.Application;
import com.labourlink.labourlinkai.entity.DailyAttendance;
import com.labourlink.labourlinkai.entity.Job;
import com.labourlink.labourlinkai.entity.WorkerAllocation;
import com.labourlink.labourlinkai.repository.DailyAttendanceRepository;
import com.labourlink.labourlinkai.repository.JobRepository;
import com.labourlink.labourlinkai.repository.WorkerAllocationRepository;
import com.labourlink.labourlinkai.replacement.ReplacementScheduling;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class AllocationService {
    private static final ZoneId WORK_ZONE = ZoneId.of("Asia/Kolkata");

    private final WorkerAllocationRepository allocations;
    private final DailyAttendanceRepository attendance;
    private final JobRepository jobs;
    private final WorkerService workers;
    private final ContractorService contractors;
    private final ReplacementScheduling replacementScheduling;
    private final AttendanceCorrectionJournal corrections;

    public AllocationService(WorkerAllocationRepository allocations, DailyAttendanceRepository attendance,
                             JobRepository jobs, WorkerService workers, ContractorService contractors,
                             ReplacementScheduling replacementScheduling, AttendanceCorrectionJournal corrections) {
        this.allocations = allocations;
        this.attendance = attendance;
        this.jobs = jobs;
        this.workers = workers;
        this.contractors = contractors;
        this.replacementScheduling = replacementScheduling;
        this.corrections = corrections;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    void createForNewAcceptance(Application application, Job job) {
        replacementScheduling.lockAndCheckPermanentWork(application.getWorkerId(), job.getStartDate(), job.getEndDate());
        allocations.save(new WorkerAllocation(application, job));
    }

    WorkerAllocation.Status statusForApplication(Long applicationId) {
        return allocations.findStatusByApplicationId(applicationId).orElse(null);
    }

    public List<AllocationDTO> contractorAllocations(String phone) {
        return allocations.listByContractor(contractorId(phone));
    }

    public List<AllocationDTO> workerAllocations(String phone) {
        return allocations.listByWorker(workers.getWorkerByPhone(phone).getWorkerId());
    }

    public List<AttendanceDTO> contractorAttendance(Long id, String phone) {
        requireContractorOwner(find(id), contractorId(phone));
        return attendanceFor(id);
    }

    public List<AttendanceDTO> workerAttendance(Long id, String phone) {
        if (!find(id).getWorkerId().equals(workers.getWorkerByPhone(phone).getWorkerId())) {
            throw new IllegalStateException("Access denied: You do not own this allocation");
        }
        return attendanceFor(id);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void setSchedule(Long id, String phone, LocalDate start, LocalDate end) {
        WorkerAllocation allocation = lock(id);
        requireContractorOwner(allocation, contractorId(phone));
        requireActive(allocation);
        if (start == null || end == null || start.isAfter(end)) {
            throw new IllegalArgumentException("Provide both schedule dates in chronological order");
        }
        if (allocation.getStartDate() != null) {
            if (start.equals(allocation.getStartDate()) && end.equals(allocation.getEndDate())) return;
            throw new IllegalStateException("Allocation already has a confirmed schedule");
        }
        Job job = jobs.findById(allocation.getJobId()).orElseThrow(() -> new IllegalStateException("Job not found"));
        if (job.getStartDate() != null && (start.isBefore(job.getStartDate()) || end.isAfter(job.getEndDate()))) {
            throw new IllegalArgumentException("Allocation dates must fall within the job schedule");
        }
        replacementScheduling.lockAndCheckPermanentWork(allocation.getWorkerId(), start, end);
        allocation.setSchedule(start, end);
    }

    @Transactional
    public void changeStatus(Long id, String phone, WorkerAllocation.Status status) {
        Long contractorId = contractorId(phone);
        Long jobId = allocations.findJobId(id).orElseThrow(() -> new IllegalStateException("Allocation not found"));
        jobs.findByIdForUpdate(jobId).orElseThrow(() -> new IllegalStateException("Job not found"));
        WorkerAllocation allocation = lock(id);
        requireContractorOwner(allocation, contractorId);
        if (allocation.getStatus() == status) return;
        requireActive(allocation);
        if (status == null || status == WorkerAllocation.Status.ACTIVE) {
            throw new IllegalArgumentException("Choose COMPLETED or CANCELLED");
        }
        allocation.setStatus(status);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AttendanceDTO markAttendance(Long id, String phone, LocalDate workDate, DailyAttendance.Status status) {
        WorkerAllocation allocation = lockAttendanceAssignment(id);
        Long contractorId = contractorId(phone);
        requireContractorOwner(allocation, contractorId);
        requireActive(allocation);
        requireAttendanceDate(allocation, workDate);
        if (status == null) throw new IllegalArgumentException("Attendance status is required");
        var existing = attendance.findByAllocationIdAndWorkDate(id, workDate);
        if (existing.isPresent()) {
            if (existing.get().getStatus() == status) return toDTO(existing.get());
            throw new IllegalStateException("Use a reasoned correction to change recorded attendance");
        }
        DailyAttendance day = new DailyAttendance(id, workDate);
        day.mark(status, contractorId);
        return toDTO(attendance.save(day));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AttendanceDTO correctAttendance(Long id, String phone, LocalDate date, AttendanceCorrectionInput input) {
        WorkerAllocation allocation = lockAttendanceAssignment(id);
        Long owner = contractorId(phone);
        requireContractorOwner(allocation, owner);
        requireAttendanceDate(allocation, date);
        DailyAttendance day = recordedDay(id, date);
        var correctedAt = corrections.append(day.getAttendanceId(), null, date, day.getStatus(),
                day.getMarkedByContractorId(), day.getMarkedAt(), owner, input);
        day.mark(input.status(), owner, correctedAt);
        return toDTO(day);
    }

    public List<AttendanceCorrectionDTO> attendanceCorrections(Long id, String phone, LocalDate date) {
        requireContractorOwner(find(id), contractorId(phone));
        return corrections.forAttendance(recordedDay(id, date).getAttendanceId());
    }

    private DailyAttendance recordedDay(Long id, LocalDate date) {
        return attendance.findByAllocationIdAndWorkDate(id, date)
                .orElseThrow(() -> new IllegalStateException("Recorded attendance not found"));
    }

    private WorkerAllocation lockAttendanceAssignment(Long id) {
        Long jobId = allocations.findJobId(id).orElseThrow(() -> new IllegalStateException("Allocation not found"));
        jobs.findByIdForUpdate(jobId).orElseThrow(() -> new IllegalStateException("Job not found"));
        return lock(id);
    }

    private static void requireAttendanceDate(WorkerAllocation allocation, LocalDate workDate) {
        if (allocation.getStartDate() == null || allocation.getEndDate() == null) {
            throw new IllegalStateException("Confirm the allocation schedule before marking attendance");
        }
        if (workDate == null || workDate.isBefore(allocation.getStartDate())
                || workDate.isAfter(allocation.getEndDate()) || workDate.isAfter(LocalDate.now(WORK_ZONE))) {
            throw new IllegalArgumentException("Attendance date must be in the allocation schedule and not in the future");
        }
    }

    private List<AttendanceDTO> attendanceFor(Long id) {
        return attendance.findByAllocationIdOrderByWorkDateDesc(id).stream().map(AllocationService::toDTO).toList();
    }

    private static AttendanceDTO toDTO(DailyAttendance day) {
        return new AttendanceDTO(day.getWorkDate(), day.getStatus(), day.getMarkedByContractorId(), day.getMarkedAt());
    }

    private Long contractorId(String phone) { return contractors.getContractorByPhone(phone).getContractorId(); }

    private WorkerAllocation find(Long id) {
        return allocations.findById(id).orElseThrow(() -> new IllegalStateException("Allocation not found"));
    }

    private WorkerAllocation lock(Long id) {
        return allocations.findForUpdate(id).orElseThrow(() -> new IllegalStateException("Allocation not found"));
    }

    private void requireContractorOwner(WorkerAllocation allocation, Long contractorId) {
        if (!allocation.getContractorId().equals(contractorId)
                || !jobs.existsByJobIdAndContractorId(allocation.getJobId(), contractorId)) {
            throw new IllegalStateException("Access denied: You do not own this allocation");
        }
    }

    private static void requireActive(WorkerAllocation allocation) {
        if (allocation.getStatus() != WorkerAllocation.Status.ACTIVE) {
            throw new IllegalStateException("Allocation is no longer active");
        }
    }
}
