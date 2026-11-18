import { request } from './api';
import type { AllocationStatus } from './allocationService';

export interface ApplicationRecord {
  applicationId: number;
  jobId: number;
  jobTitle: string;
  jobLocation: string;
  wagePerDay: number | null;
  workerId: number;
  workerName: string;
  workerPhone: string;
  workerSkill: string;
  workerExperience: number | null;
  workerLocation: string | null;
  workerAvailability: boolean | null;
  workerExpectedWagePerDay: number | null;
  applicationDate: string | null;
  status: string | null;
  acceptedAt?: string | null;
  allocationStatus?: AllocationStatus | null;
}

export interface ArchivedApplicationRecord {
  applicationId: number;
  jobId: number;
  jobTitle: string | null;
  applicationDate: string | null;
  status: string | null;
}

export interface HiringSelection {
  applicationId: number;
  jobId: number;
  jobTitle: string;
  workerId: number;
  workerName: string;
  workerSkill: string;
  applicationDate: string | null;
  acceptedAt: string | null;
}

export const getArchivedApplications = () =>
  request<ArchivedApplicationRecord[]>('/applications/history/archived', { auth: true });

export const getContractorSelections = () =>
  request<HiringSelection[]>('/applications/history/contractor', { auth: true });

export const applyForJob = (jobId: number) =>
  request('/applications', {
    method: 'POST',
    body: { jobId },
    auth: true,
  });

export const getMyApplications = () =>
  request<ApplicationRecord[]>('/applications/my', { auth: true });

export const getJobApplicants = (jobId: number) =>
  request<ApplicationRecord[]>(`/applications/job/${jobId}`, { auth: true });

export const updateApplicationStatus = (applicationId: number, status: string) =>
  request<ApplicationRecord>(`/applications/${applicationId}/status?status=${encodeURIComponent(status)}`, {
    method: 'PUT',
    auth: true,
  });
