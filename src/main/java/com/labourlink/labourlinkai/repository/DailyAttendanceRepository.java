package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.DailyAttendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyAttendanceRepository extends JpaRepository<DailyAttendance, Long> {
    Optional<DailyAttendance> findByAllocationIdAndWorkDate(Long allocationId, LocalDate workDate);

    List<DailyAttendance> findByAllocationIdOrderByWorkDateDesc(Long allocationId);
}
