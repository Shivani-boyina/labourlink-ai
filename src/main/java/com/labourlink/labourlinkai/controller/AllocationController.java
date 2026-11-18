package com.labourlink.labourlinkai.controller;

import com.labourlink.labourlinkai.dto.AllocationDTO;
import com.labourlink.labourlinkai.dto.AttendanceDTO;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionDTO;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionInput;
import com.labourlink.labourlinkai.entity.DailyAttendance;
import com.labourlink.labourlinkai.entity.WorkerAllocation;
import com.labourlink.labourlinkai.service.AllocationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/allocations")
public class AllocationController {
    private final AllocationService allocations;

    public AllocationController(AllocationService allocations) { this.allocations = allocations; }

    record Schedule(@NotNull LocalDate startDate, @NotNull LocalDate endDate) {}
    record AllocationStatus(@NotNull WorkerAllocation.Status status) {}
    record AttendanceMark(@NotNull DailyAttendance.Status status) {}

    @GetMapping("/contractor")
    public List<AllocationDTO> contractorAllocations(Principal principal) {
        return allocations.contractorAllocations(principal.getName());
    }

    @GetMapping("/worker")
    public List<AllocationDTO> workerAllocations(Principal principal) {
        return allocations.workerAllocations(principal.getName());
    }

    @GetMapping("/contractor/{id}/attendance")
    public List<AttendanceDTO> contractorAttendance(@PathVariable Long id, Principal principal) {
        return allocations.contractorAttendance(id, principal.getName());
    }

    @GetMapping("/worker/{id}/attendance")
    public List<AttendanceDTO> workerAttendance(@PathVariable Long id, Principal principal) {
        return allocations.workerAttendance(id, principal.getName());
    }

    @PutMapping("/contractor/{id}/schedule")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void schedule(@PathVariable Long id, Principal principal, @Valid @RequestBody Schedule schedule) {
        allocations.setSchedule(id, principal.getName(), schedule.startDate(), schedule.endDate());
    }

    @PutMapping("/contractor/{id}/status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void status(@PathVariable Long id, Principal principal, @Valid @RequestBody AllocationStatus request) {
        allocations.changeStatus(id, principal.getName(), request.status());
    }

    @PutMapping("/contractor/{id}/attendance/{date}")
    public AttendanceDTO mark(@PathVariable Long id, @PathVariable LocalDate date, Principal principal,
                              @Valid @RequestBody AttendanceMark request) {
        return allocations.markAttendance(id, principal.getName(), date, request.status());
    }

    @GetMapping("/contractor/{id}/attendance/{date}/corrections")
    public List<AttendanceCorrectionDTO> corrections(@PathVariable Long id, @PathVariable LocalDate date, Principal principal) {
        return allocations.attendanceCorrections(id, principal.getName(), date);
    }

    @PostMapping("/contractor/{id}/attendance/{date}/corrections")
    public AttendanceDTO correct(@PathVariable Long id, @PathVariable LocalDate date, Principal principal,
                                 @Valid @RequestBody AttendanceCorrectionInput input) {
        return allocations.correctAttendance(id, principal.getName(), date, input);
    }
}
