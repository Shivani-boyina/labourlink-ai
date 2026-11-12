import {
  asArray,
  request,
  USE_MOCK,
} from './api';

import {
  MOCK_JOBS,
  MOCK_WORKERS,
} from './mockData';

import type {
  Job,
  JobFilters,
  JobInput,
} from '../types/Job';

import type { Worker } from '../types/Worker';

const hasFilters = (
  f: JobFilters
) =>
  Object.values(f).some(
    (v) => v && v.trim() !== ''
  );

export async function getJobs(): Promise<Job[]> {
  if (USE_MOCK) {
    return MOCK_JOBS;
  }

  return asArray<Job>(
    await request<unknown>(
      '/jobs',
      {
        auth: true,
      }
    )
  );
}

export async function searchJobs(
  filters: JobFilters
): Promise<Job[]> {

  if (!hasFilters(filters)) {
    return getJobs();
  }

  if (USE_MOCK) {
    return MOCK_JOBS;
  }

  const results = asArray<Job | { job: Job }>(
    await request<unknown>(
      '/jobs/search',
      {
        query: {
          ...filters,
        },
        auth: true,
      }
    )
  );
  return results.map((result) => ('job' in result ? result.job : result));
}

export async function getJob(
  id: string
): Promise<Job> {

  if (USE_MOCK) {
    const j = MOCK_JOBS.find(
      (m) => String(m.jobId) === id
    );

    if (!j) {
      throw new Error(
        'Job not found.'
      );
    }

    return j;
  }

  return request<Job>(
    `/jobs/${encodeURIComponent(id)}`,
    {
      auth: true,
    }
  );
}

export const createJob = (
  job: JobInput
) =>
  request<Job>(
    '/jobs',
    {
      method: 'POST',
      body: job,
      auth: true,
    }
  );

export const deleteJob = (
  id: number
) =>
  request<void>(
    `/jobs/${id}`,
    {
      method: 'DELETE',
      auth: true,
    }
  );

export async function getMatches(
  id: string
): Promise<Worker[]> {

  if (USE_MOCK) {
    return MOCK_WORKERS;
  }

  return asArray<Worker>(
    await request<unknown>(
      `/jobs/${encodeURIComponent(id)}/matches`,
      {
        auth: true,
      }
    )
  );
}
