import { request } from './api';

export type AllocationStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'PENDING';

export interface Allocation {
  allocationId: number;
  applicationId: number;
  jobId: number;
  jobTitle: string;
  workerId: number;
  workerName: string;
  status: AllocationStatus;
  allocatedAt: string;
  startDate: string | null;
  endDate: string | null;
}

export interface Attendance {
  workDate: string;
  status: AttendanceStatus;
  markedAt: string;
  markedByContractorId: number;
}

type Role = 'worker' | 'contractor';

export const getAllocations = (role: Role) =>
  request<Allocation[]>(`/allocations/${role}`, { auth: true });

export const getAttendance = (role: Role, id: number) =>
  request<Attendance[]>(`/allocations/${role}/${id}/attendance`, { auth: true });

export const confirmSchedule = (id: number, startDate: string, endDate: string) =>
  request<void>(`/allocations/contractor/${id}/schedule`, { method: 'PUT', auth: true, body: { startDate, endDate } });

export const updateAllocationStatus = (id: number, status: AllocationStatus) =>
  request<void>(`/allocations/contractor/${id}/status`, { method: 'PUT', auth: true, body: { status } });

export const markAttendance = (id: number, date: string, status: AttendanceStatus) =>
  request<Attendance>(`/allocations/contractor/${id}/attendance/${encodeURIComponent(date)}`, {
    method: 'PUT', auth: true, body: { status },
  });
