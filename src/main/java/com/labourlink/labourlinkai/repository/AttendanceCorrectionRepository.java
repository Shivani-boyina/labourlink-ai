package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.AttendanceCorrection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AttendanceCorrectionRepository extends JpaRepository<AttendanceCorrection, Long> {
    List<AttendanceCorrection> findByAttendanceIdOrderById(Long attendanceId);
    List<AttendanceCorrection> findByCoverageIdOrderById(Long coverageId);
}
