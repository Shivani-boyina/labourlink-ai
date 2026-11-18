package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.entity.Job;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.*;

@Repository
public class MatchingDataRepository {
    private static final ZoneId WORK_ZONE = ZoneId.of("Asia/Kolkata");
    private final NamedParameterJdbcTemplate jdbc;

    public MatchingDataRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public record Month(Instant start, Instant end) {
        public static Month containing(Instant instant) {
            LocalDate first = instant.atZone(WORK_ZONE).toLocalDate().withDayOfMonth(1);
            return new Month(first.atStartOfDay(WORK_ZONE).toInstant(), first.plusMonths(1).atStartOfDay(WORK_ZONE).toInstant());
        }
    }

    public record AllocationHistory(Map<Long, Long> totals, Set<Long> uncertain) {
        public OptionalLong countFor(Long workerId) {
            return uncertain.contains(workerId) ? OptionalLong.empty() : OptionalLong.of(totals.getOrDefault(workerId, 0L));
        }
    }

    public AllocationHistory monthlyAllocations(Collection<Long> ids, Month month) {
        if (ids.isEmpty()) return new AllocationHistory(Map.of(), Set.of());
        var parameters = Map.of("ids", ids, "start", LocalDateTime.ofInstant(month.start, ZoneOffset.UTC),
                "end", LocalDateTime.ofInstant(month.end, ZoneOffset.UTC));
        Map<Long, Long> counts = jdbc.query("""
                SELECT worker_id, COUNT(DISTINCT job_id) FROM worker_allocations
                WHERE worker_id IN (:ids) AND allocated_at >= :start AND allocated_at < :end GROUP BY worker_id
                """, parameters, rows -> {
            Map<Long, Long> totals = new HashMap<>();
            while (rows.next()) totals.put(rows.getLong(1), rows.getLong(2));
            return totals;
        });
        Set<Long> uncertain = new HashSet<>(jdbc.query("""
                SELECT a.worker_id FROM applications a
                WHERE a.worker_id IN (:ids) AND a.status = 'ACCEPTED'
                  AND (a.accepted_at IS NULL OR (a.accepted_at >= :start AND a.accepted_at < :end))
                  AND NOT EXISTS (SELECT 1 FROM worker_allocations x WHERE x.application_id = a.application_id)
                UNION
                SELECT original_worker_id FROM archived_application_history
                WHERE original_worker_id IN (:ids) AND original_status = 'ACCEPTED'
                """, parameters, (row, index) -> row.getLong(1)));
        return new AllocationHistory(Map.copyOf(counts), Set.copyOf(uncertain));
    }

    public Set<Long> unavailableFor(Collection<Long> ids, Job job, Instant at) {
        if (ids.isEmpty()) return Set.of();
        Map<String, Object> parameters = new HashMap<>();
        parameters.put("ids", ids);
        parameters.put("job", job.getJobId());
        parameters.put("today", at.atZone(WORK_ZONE).toLocalDate());
        parameters.put("start", job.getStartDate());
        parameters.put("end", job.getEndDate());
        return new HashSet<>(jdbc.query("""
                SELECT a.worker_id FROM applications a
                WHERE a.job_id = :job AND a.worker_id IN (:ids) AND a.status = 'ACCEPTED'
                UNION
                SELECT wa.worker_id FROM worker_allocations wa WHERE wa.worker_id IN (:ids)
                AND ((wa.status = 'ACTIVE' AND (wa.start_date IS NULL OR :start IS NULL))
                    OR (wa.status IN ('ACTIVE','COMPLETED') AND wa.start_date <= :end AND wa.end_date >= :start))
                UNION
                SELECT c.worker_id FROM replacement_coverage c WHERE c.worker_id IN (:ids)
                AND ((:start IS NULL AND c.work_date >= :today) OR (c.work_date BETWEEN :start AND :end))
                """, parameters, (row, index) -> row.getLong(1)));
    }
}
