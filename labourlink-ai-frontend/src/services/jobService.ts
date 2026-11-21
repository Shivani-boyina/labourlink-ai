import {
  asArray,
  request,
  ApiError,
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

import i18n from '../i18n';
import type { WorkerMatch } from '../types/Worker';

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

export interface JobRecommendation {
  job: Job;
  matchingScore: number;
  contractorName?: string | null;
  matchingReasons?: string[] | null;
  recommendation?: {
    method: 'ML' | 'RULE_BASED';
    matchPercentage: number | null;
    fallbackReason: string | null;
    featureIssues?: Array<{ feature: string; reason: string }>;
  } | null;
}

export interface RecommendationDetails {
  recommendations: JobRecommendation[];
  exclusions: string[];
  excludedJobs?: Record<string, string>;
  compatibility?: Record<string, { skillMatch: number; rulesScore: number }>;
}

function validScore(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

export async function getMyRecommendations(): Promise<RecommendationDetails> {
  if (USE_MOCK) return { recommendations: [], exclusions: [] };

  let result: RecommendationDetails;
  try {
    result = await request<RecommendationDetails>('/jobs/recommendations/me', {
      auth: true,
      query: { details: 'true' },
    });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    console.warn('Worker recommendations request failed', {
      endpoint: '/jobs/recommendations/me', status: error.status,
    });
    if (error.status === 400 || error.status >= 500) {
      throw new ApiError(i18n.t('dashboardMatching.requestFailed'), error.status);
    }
    throw error;
  }
  if (Array.isArray(result)) {
    throw new ApiError(i18n.t('dashboardMatching.detailsUnavailable'), 502);
  }
  if (!Array.isArray(result?.recommendations) ||
      result.recommendations.some((row) => !Number.isSafeInteger(row?.job?.jobId) ||
        !validScore(row.matchingScore) ||
        (row.recommendation?.method === 'ML' && !validScore(row.recommendation.matchPercentage))) ||
      !Array.isArray(result.exclusions) || result.exclusions.some((reason) => typeof reason !== 'string') ||
      (result.excludedJobs !== undefined && (result.excludedJobs === null || typeof result.excludedJobs !== 'object' ||
        Array.isArray(result.excludedJobs) || Object.values(result.excludedJobs).some((reason) => typeof reason !== 'string')))) {
    throw new ApiError(i18n.t('dashboardMatching.invalidResponse'), 502);
  }
  if (result.compatibility !== undefined &&
      (!result.compatibility || typeof result.compatibility !== 'object' || Array.isArray(result.compatibility) ||
        Object.values(result.compatibility).some((entry) =>
          !validScore(entry?.skillMatch) || !validScore(entry?.rulesScore)))) {
    throw new ApiError(i18n.t('dashboardMatching.invalidResponse'), 502);
  }
  return result;
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

export const updateJob = (id: number, job: JobInput) =>
  request<Job>(`/jobs/${id}`, {
    method: 'PUT',
    body: job,
    auth: true,
  });

export const closeJob = (id: number) =>
  request<Job>(`/jobs/${id}/close`, {
    method: 'PATCH',
    auth: true,
  });

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
  id: string,
  includePrediction = true
): Promise<WorkerMatch[]> {

  if (USE_MOCK) {
    return MOCK_WORKERS;
  }

  const matches = await request<WorkerMatch[]>(`/jobs/${encodeURIComponent(id)}/matches`, {
    auth: true,
    query: { includePrediction: String(includePrediction) },
  });
  if (!Array.isArray(matches) || matches.some((worker) => !Number.isSafeInteger(worker?.workerId) ||
      (worker.skillMatch != null && !validScore(worker.skillMatch)) ||
      (worker.matchingScore != null && !validScore(worker.matchingScore)) ||
      (worker.recommendation?.method === 'ML' && !validScore(worker.recommendation.matchPercentage)))) {
    throw new ApiError(i18n.t('dashboardMatching.invalidResponse'), 502);
  }
  return matches;
}
