import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Field, { fieldProps } from '../components/Field';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import { getContractorReviewEngagements, getMyReviews, saveReview, type ReviewEngagement } from '../services/reviewService';
import { useFetch } from '../utils/useFetch';

type Role = 'worker' | 'contractor';

export default function WorkerReviews({ role }: { role: Role }) {
  const { session } = useAuth();
  return <ReviewList key={role + session?.userId} role={role} />;
}

function ReviewList({ role }: { role: Role }) {
  const { t } = useTranslation();
  const rows = useFetch(role === 'contractor' ? getContractorReviewEngagements : getMyReviews, [role]);
  return <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:py-12">
    <Link to={`/${role}/dashboard`} className="font-semibold text-blue-700">
      {t(role === 'worker' ? 'workerApplications.backToDashboard' : 'contractorProfile.backToDashboard')}
    </Link>
    <h1 className="text-3xl font-bold">{t(role === 'contractor' ? 'review.manage' : 'review.mine')}</h1>
    {rows.loading && <LoadingSpinner label={t('review.loading')} />}
    {rows.error && <ErrorMessage message={rows.error} onRetry={rows.reload} />}
    {!rows.loading && !rows.error && rows.data?.length === 0 &&
      <EmptyState title={t(role === 'worker' ? 'review.noReviews' : 'review.noEligibleWork')} />}
    {!rows.error && <ul className="grid gap-4 sm:grid-cols-2">
      {rows.data?.map((entry) => <li key={`${entry.jobId}-${entry.workerId}`} className="card space-y-3 p-5">
        <h2 className="text-lg font-bold">{entry.jobTitle}{role === 'contractor' ? ` · ${entry.workerName}` : ''}</h2>
        {entry.rating != null && <p>{t('review.recordedRating', { rating: entry.rating })}</p>}
        {entry.feedback && <p className="whitespace-pre-wrap break-words">{entry.feedback}</p>}
        {!entry.verified && <p className="rounded bg-amber-50 p-3 text-sm text-amber-950">{t('review.evidenceMissing')}</p>}
        {role === 'contractor' && entry.verified && <ReviewEditor engagement={entry} refresh={rows.reload} />}
      </li>)}
    </ul>}
  </main>;
}

function ReviewEditor({ engagement, refresh }: { engagement: ReviewEngagement; refresh: () => void }) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(engagement.rating?.toString() ?? '');
  const [feedback, setFeedback] = useState(engagement.feedback ?? '');
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const key = `review-${engagement.jobId}-${engagement.workerId}`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSuccess(false);
    setFailure(null);
    try {
      await saveReview(engagement, Number(rating), feedback);
      setSuccess(true);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      refresh();
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="space-y-3 border-t pt-3">
    <Field id={key + '-rating'} label={t('review.rating')}>
      <select {...fieldProps(key + '-rating')} required value={rating}
        onChange={(e) => { setRating(e.target.value); setSuccess(false); }}>
        <option value="">{t('review.chooseRating')}</option>
        {[1, 2, 3, 4, 5].map((value) => <option value={value} key={value}>{value}</option>)}
      </select>
    </Field>
    <Field id={key + '-feedback'} label={t('review.feedback')}>
      <textarea {...fieldProps(key + '-feedback')} maxLength={1000} value={feedback}
        onChange={(e) => { setFeedback(e.target.value); setSuccess(false); }} />
    </Field>
    <button type="submit" className="btn-primary" disabled={busy}>
      {t(engagement.reviewId == null ? 'review.submit' : 'review.update')}
    </button>
    {failure && <ErrorMessage message={failure} />}
    {success && <p role="status" className="text-emerald-800">{t('review.saved')}</p>}
  </form>;
}
