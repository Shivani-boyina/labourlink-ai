import { request } from './api';

export type OfferState = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
export interface ReplacementOffer {
  offerId: number;
  requestId: number;
  workerId: number;
  workerName: string;
  jobTitle: string;
  jobLocation: string;
  dailyWage: number | null;
  workDate: string;
  state: OfferState;
  expiresAt: string;
  attendanceStatus: 'PRESENT' | 'ABSENT' | null;
  markedAt: string | null;
}
export interface ReplacementRequest {
  requestId: number;
  allocationId: number;
  jobTitle: string;
  absentWorkerName: string;
  workDate: string;
  state: 'OPEN' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';
  offers: ReplacementOffer[];
}
interface Absence {
  allocationId: number;
  jobTitle: string;
  workerName: string;
  workDate: string;
  requestable: boolean;
}
interface Candidate {
  workerId: number;
  workerName: string;
  skill: string;
  location: string;
  experience: number | null;
  reasons: string[];
}

const contractor = '/replacements/contractor';
const worker = '/replacements/worker/offers';
const path = (id: number) => `${contractor}/requests/${id}`;

export const getReplacementWorkspace = async () => {
  const [absences, requests] = await Promise.all([
    request<Absence[]>(`${contractor}/absences`, { auth: true }),
    request<ReplacementRequest[]>(`${contractor}/requests`, { auth: true }),
  ]);
  return { absences, requests };
};
export const newReplacementRequest = (allocationId: number, workDate: string) =>
  request<ReplacementRequest>(`${contractor}/requests`, { auth: true, method: 'POST', body: { allocationId, workDate } });
export const getReplacementCandidates = (id: number) =>
  request<Candidate[]>(`${path(id)}/recommendations`, { auth: true });
export const sendReplacementOffer = (id: number, workerId: number) =>
  request<ReplacementOffer>(`${path(id)}/offers`, { auth: true, method: 'POST', body: { workerId } });
export const cancelReplacementOffer = (id: number, offerId: number) =>
  request<ReplacementOffer>(`${path(id)}/offers/${offerId}/cancel`, { auth: true, method: 'PUT' });
export const cancelReplacementRequest = (id: number) =>
  request<ReplacementRequest>(`${path(id)}/cancel`, { auth: true, method: 'PUT' });
export const markReplacement = (id: number, workDate: string, status: 'PRESENT' | 'ABSENT') =>
  request<ReplacementOffer>(`${path(id)}/attendance/${encodeURIComponent(workDate)}`, { auth: true, method: 'PUT', body: { status } });
export const getReplacementOffers = () => request<ReplacementOffer[]>(worker, { auth: true });
export const respondToReplacementOffer = (id: number, decision: 'ACCEPT' | 'DECLINE') =>
  request<ReplacementOffer>(`${worker}/${id}/response`, { auth: true, method: 'PUT', body: { decision } });
