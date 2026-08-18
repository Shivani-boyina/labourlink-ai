package com.labourlink.labourlinkai.service;

import com.labourlink.labourlinkai.dto.JobMatchDTO;
import com.labourlink.labourlinkai.entity.Job;

import java.util.List;

public interface JobService {

    Job createJob(Job job);

    List<Job> getAllJobs();

    Job getJobById(Long id);

    void deleteJob(Long id);

    List<JobMatchDTO> searchJobs(String skill,
                                 String location,
                                 Double minWage,
                                 Double maxWage);
}