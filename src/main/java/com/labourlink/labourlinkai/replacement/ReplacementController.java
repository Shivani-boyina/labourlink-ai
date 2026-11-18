package com.labourlink.labourlinkai.replacement;

import com.labourlink.labourlinkai.entity.DailyAttendance;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionDTO;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionInput;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/replacements")
public class ReplacementController {
    private final ReplacementService replacements;

    public ReplacementController(ReplacementService replacements) {
        this.replacements = replacements;
    }

    record RequestInput(@NotNull Long allocationId, @NotNull LocalDate workDate) {}
    record OfferInput(@NotNull Long workerId) {}
    enum Decision { ACCEPT, DECLINE }
    record ResponseInput(@NotNull Decision decision) {}
    record AttendanceInput(@NotNull DailyAttendance.Status status) {}

    @GetMapping("/contractor/absences")
    public List<ReplacementService.Absence> absences(Principal principal) {
        return replacements.absences(principal.getName());
    }

    @GetMapping("/contractor/requests")
    public List<ReplacementService.RequestView> requests(Principal principal) {
        return replacements.contractorRequests(principal.getName());
    }

    @PostMapping("/contractor/requests")
    public ReplacementService.RequestView create(Principal principal, @Valid @RequestBody RequestInput input) {
        return replacements.create(principal.getName(), input.allocationId(), input.workDate());
    }

    @GetMapping("/contractor/requests/{requestId}/recommendations")
    public List<ReplacementService.Candidate> recommendations(Principal principal, @PathVariable Long requestId) {
        return replacements.recommendations(principal.getName(), requestId);
    }

    @PostMapping("/contractor/requests/{requestId}/offers")
    public ReplacementService.OfferView send(Principal principal, @PathVariable Long requestId,
                                             @Valid @RequestBody OfferInput input) {
        return replacements.send(principal.getName(), requestId, input.workerId());
    }

    @PutMapping("/contractor/requests/{requestId}/offers/{offerId}/cancel")
    public ReplacementService.OfferView cancelOffer(Principal principal, @PathVariable Long requestId,
                                                    @PathVariable Long offerId) {
        return replacements.cancelOffer(principal.getName(), requestId, offerId);
    }

    @PutMapping("/contractor/requests/{requestId}/cancel")
    public ReplacementService.RequestView cancelRequest(Principal principal, @PathVariable Long requestId) {
        return replacements.cancelRequest(principal.getName(), requestId);
    }

    @PutMapping("/contractor/requests/{requestId}/attendance/{date}")
    public ReplacementService.OfferView mark(Principal principal, @PathVariable Long requestId,
                                             @PathVariable LocalDate date, @Valid @RequestBody AttendanceInput input) {
        return replacements.mark(principal.getName(), requestId, date, input.status());
    }

    @GetMapping("/contractor/requests/{requestId}/attendance/{date}/corrections")
    public List<AttendanceCorrectionDTO> corrections(Principal principal, @PathVariable Long requestId,
                                                      @PathVariable LocalDate date) {
        return replacements.attendanceCorrections(principal.getName(), requestId, date);
    }

    @PostMapping("/contractor/requests/{requestId}/attendance/{date}/corrections")
    public ReplacementService.OfferView correct(Principal principal, @PathVariable Long requestId,
                                                @PathVariable LocalDate date,
                                                @Valid @RequestBody AttendanceCorrectionInput input) {
        return replacements.correctAttendance(principal.getName(), requestId, date, input);
    }

    @GetMapping("/worker/offers")
    public List<ReplacementService.OfferView> offers(Principal principal) {
        return replacements.workerOffers(principal.getName());
    }

    @PutMapping("/worker/offers/{offerId}/response")
    public ReplacementService.OfferView respond(Principal principal, @PathVariable Long offerId,
                                                @Valid @RequestBody ResponseInput input) {
        return replacements.respond(principal.getName(), offerId, input.decision() == Decision.ACCEPT);
    }
}
