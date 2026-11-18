package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.dto.AttendanceCorrectionDTO;
import com.labourlink.labourlinkai.dto.AttendanceCorrectionInput;
import com.labourlink.labourlinkai.entity.AttendanceCorrection;
import com.labourlink.labourlinkai.entity.DailyAttendance;
import com.labourlink.labourlinkai.repository.AttendanceCorrectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
public class AttendanceCorrectionJournal {
    private final AttendanceCorrectionRepository events;

    public AttendanceCorrectionJournal(AttendanceCorrectionRepository events) {
        this.events = events;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public Instant append(Long attendanceId, Long coverageId, LocalDate date, DailyAttendance.Status previous,
                          Long previousActor, Instant previousMarkedAt, Long actor, AttendanceCorrectionInput input) {
        String reason = input.reason() == null ? "" : input.reason().strip();
        if (reason.length() < 12 || reason.length() > 500 || reason.codePoints().filter(Character::isLetter).count() < 6) {
            throw new IllegalArgumentException("Provide a meaningful correction reason of 12 to 500 characters");
        }
        if (!previousMarkedAt.equals(input.expectedMarkedAt())) {
            throw new IllegalStateException("Attendance changed since it was loaded");
        }
        if (input.status() == null || previous == input.status()) {
            throw new IllegalArgumentException("Choose a different attendance status");
        }
        Instant correctedAt = Instant.now().truncatedTo(ChronoUnit.MICROS);
        if (!correctedAt.isAfter(previousMarkedAt)) {
            throw new IllegalStateException("Attendance clock did not advance; reload and retry");
        }
        events.save(new AttendanceCorrection(attendanceId, coverageId, date, previous, input.status(), reason,
                previousActor, previousMarkedAt, actor, correctedAt));
        return correctedAt;
    }

    public List<AttendanceCorrectionDTO> forAttendance(Long id) {
        return events.findByAttendanceIdOrderById(id).stream().map(AttendanceCorrectionJournal::toDTO).toList();
    }

    public List<AttendanceCorrectionDTO> forCoverage(Long id) {
        return events.findByCoverageIdOrderById(id).stream().map(AttendanceCorrectionJournal::toDTO).toList();
    }

    private static AttendanceCorrectionDTO toDTO(AttendanceCorrection event) {
        return new AttendanceCorrectionDTO(event.getId(), event.getWorkDate(), event.getPreviousStatus(),
                event.getNewStatus(), event.getReason(), event.getContractorId(), event.getCorrectedAt());
    }
}
