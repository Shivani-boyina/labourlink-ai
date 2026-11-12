import { request } from './api';

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
  applicationDate: string;
  status: string;
}

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
