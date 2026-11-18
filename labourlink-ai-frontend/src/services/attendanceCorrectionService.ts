import { request } from './api';
import type { AttendanceStatus } from './allocationService';

export type CorrectionSource = 'allocation' | 'replacement';
export interface CorrectionEvent {
  id: number;
  workDate: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  contractorId: number;
  correctedAt: string;
}

function path(source: CorrectionSource, id: number, date: string) {
  const prefix = source === 'allocation' ? '/allocations/contractor' : '/replacements/contractor/requests';
  return `${prefix}/${id}/attendance/${encodeURIComponent(date)}/corrections`;
}

export const getCorrections = (source: CorrectionSource, id: number, date: string) =>
  request<CorrectionEvent[]>(path(source, id, date), { auth: true });

export const correctAttendance = (source: CorrectionSource, id: number, date: string,
  status: AttendanceStatus, expectedMarkedAt: string, reason: string) =>
  request(path(source, id, date), { auth: true, method: 'POST', body: { status, expectedMarkedAt, reason: reason.trim() } });
