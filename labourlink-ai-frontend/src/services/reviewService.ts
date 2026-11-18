import { request } from './api';

export interface ReviewEngagement {
  jobId: number;
  jobTitle: string;
  workerId: number;
  workerName: string;
  reviewId: number | null;
  rating: number | null;
  feedback: string | null;
  verified: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export const getContractorReviewEngagements = () =>
  request<ReviewEngagement[]>('/reviews/contractor', { auth: true });

export const getMyReviews = () =>
  request<ReviewEngagement[]>('/reviews/worker', { auth: true });

export const saveReview = (engagement: ReviewEngagement, rating: number, feedback: string) =>
  request(`/reviews/contractor/jobs/${engagement.jobId}/workers/${engagement.workerId}`, {
    auth: true,
    method: engagement.reviewId == null ? 'POST' : 'PUT',
    body: { rating, feedback: feedback.trim() || null },
  });
