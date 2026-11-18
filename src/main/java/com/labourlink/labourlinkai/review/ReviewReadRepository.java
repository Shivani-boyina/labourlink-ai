package com.labourlink.labourlinkai.review;

import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class ReviewReadRepository {
    public record Rating(Double averageRating, long reviewCount) {
        public static final Rating UNRATED = new Rating(null, 0);
    }
    public record History(Long jobId, String jobTitle, Long workerId, String workerName, Long reviewId,
                          Integer rating, String feedback, boolean verified, Instant createdAt, Instant updatedAt) {}

    private static final String VERIFIED = """
            EXISTS (SELECT 1 FROM verified_worker_engagements v WHERE v.job_id = r.job_id
                AND v.worker_id = r.worker_id AND v.contractor_id = r.contractor_id)
            """;
    private final NamedParameterJdbcTemplate jdbc;

    public ReviewReadRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    Optional<WorkerReviewRepository.Evidence> evidence(Long jobId, Long workerId, Long ownerId) {
        return jdbc.query("""
                SELECT evidence_date, attendance_id, coverage_id
                FROM verified_worker_engagements
                WHERE job_id = :job AND worker_id = :worker AND contractor_id = :owner
                ORDER BY evidence_date, attendance_id, coverage_id LIMIT 1
                """, Map.of("job", jobId, "worker", workerId, "owner", ownerId), (row, index) ->
                new WorkerReviewRepository.Evidence(row.getObject(1, LocalDate.class),
                        row.getObject(2, Long.class), row.getObject(3, Long.class))).stream().findFirst();
    }

    public Map<Long, Rating> ratings(Collection<Long> ids) {
        if (ids.isEmpty()) return Map.of();
        return jdbc.query("""
                SELECT r.worker_id, AVG(r.rating), COUNT(*) FROM worker_reviews r
                WHERE r.worker_id IN (:ids) AND
                """ + VERIFIED + " GROUP BY r.worker_id", Map.of("ids", ids), rows -> {
            Map<Long, Rating> ratings = new java.util.HashMap<>();
            while (rows.next()) ratings.put(rows.getLong(1), new Rating(rows.getDouble(2), rows.getLong(3)));
            return ratings;
        });
    }

    List<History> contractorHistory(Long ownerId) {
        return jdbc.query("""
                SELECT j.job_id, j.title, w.worker_id, w.name, r.id, r.rating, r.feedback,
                       r.created_at, r.updated_at, EXISTS (
                           SELECT 1 FROM verified_worker_engagements v WHERE v.job_id = e.job_id
                             AND v.worker_id = e.worker_id AND v.contractor_id = e.contractor_id) AS verified
                FROM (
                  SELECT job_id, worker_id, contractor_id FROM verified_worker_engagements WHERE contractor_id = :owner
                  UNION SELECT job_id, worker_id, contractor_id FROM worker_reviews WHERE contractor_id = :owner
                ) e
                JOIN jobs j ON j.job_id = e.job_id AND j.contractor_id = :owner
                JOIN workers w ON w.worker_id = e.worker_id
                LEFT JOIN worker_reviews r ON r.job_id = e.job_id AND r.worker_id = e.worker_id
                    AND r.contractor_id = e.contractor_id
                ORDER BY j.job_id DESC, w.worker_id
                """, Map.of("owner", ownerId), ReviewReadRepository::history);
    }

    List<History> workerHistory(Long workerId) {
        return jdbc.query("""
                SELECT j.job_id, j.title, w.worker_id, w.name, r.id, r.rating, r.feedback,
                       r.created_at, r.updated_at,
                """ + VERIFIED + """
                 AS verified
                FROM worker_reviews r JOIN jobs j ON j.job_id = r.job_id JOIN workers w ON w.worker_id = r.worker_id
                WHERE r.worker_id = :worker ORDER BY r.created_at DESC, r.id DESC
                """, Map.of("worker", workerId), ReviewReadRepository::history);
    }

    private static History history(ResultSet row, int index) throws SQLException {
        var created = row.getTimestamp("created_at", utcCalendar());
        var updated = row.getTimestamp("updated_at", utcCalendar());
        return new History(row.getLong("job_id"), row.getString("title"), row.getLong("worker_id"),
                row.getString("name"), row.getObject("id", Long.class), row.getObject("rating", Integer.class),
                row.getString("feedback"), row.getBoolean("verified"), created == null ? null : created.toInstant(),
                updated == null ? null : updated.toInstant());
    }

    private static java.util.Calendar utcCalendar() {
        return java.util.Calendar.getInstance(java.util.TimeZone.getTimeZone("UTC"));
    }
}
