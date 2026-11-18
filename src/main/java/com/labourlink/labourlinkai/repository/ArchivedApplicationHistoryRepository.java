package com.labourlink.labourlinkai.repository;

import com.labourlink.labourlinkai.dto.ArchivedApplicationDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class ArchivedApplicationHistoryRepository {
    private final JdbcTemplate jdbc;

    public ArchivedApplicationHistoryRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public List<ArchivedApplicationDTO> findVisibleToWorker(Long workerId) {
        return jdbc.query("""
                SELECT h.application_id, h.job_id, h.job_title, h.original_status, h.application_date
                FROM archived_application_history h
                JOIN archived_application_worker_access access
                    ON access.application_id = h.application_id AND access.worker_id = h.original_worker_id
                WHERE access.worker_id = ?
                ORDER BY h.application_date DESC, h.application_id DESC
                """, (row, number) -> new ArchivedApplicationDTO(
                row.getLong("application_id"), row.getLong("job_id"), row.getString("job_title"),
                row.getString("original_status"), row.getString("application_date")), workerId);
    }
}
