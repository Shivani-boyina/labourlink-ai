
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import WorkerCard from '../components/WorkerCard';
import { getJob, getMatches } from '../services/jobService';
import { useFetch } from '../utils/useFetch';

export default function JobMatches() {
  const { id = '' } = useParams();
  const { t } = useTranslation();
  const job = useFetch(() => getJob(id), [id]);
  const m = useFetch(() => getMatches(id), [id]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Link
        to="/contractor/dashboard"
        className="mb-4 inline-flex items-center gap-1 font-semibold text-navy-700"
      >
        <ArrowLeft size={18} aria-hidden />
        {t('jobMatches.dashboard')}
      </Link>

      <h1 className="text-3xl font-bold">{t('jobMatches.title')}</h1>

      {job.data && (
        <p className="mt-1 text-slate-600">
          {t('jobMatches.for')}: <strong>{job.data.title}</strong>
          {' '}({job.data.requiredSkill}, {job.data.location})
        </p>
      )}

      <p className="mt-3 inline-block rounded-full bg-navy-50 px-3 py-1 text-sm font-semibold text-navy-800">
        {t('jobMatches.rule')}
      </p>

      <div className="mt-6">
        {m.loading && (
          <LoadingSpinner label={t('jobMatches.loading')} />
        )}

        {m.error && (
          <ErrorMessage message={m.error} onRetry={m.reload} />
        )}

        {!m.loading && !m.error && m.data && m.data.length === 0 && (
          <EmptyState
            title={t('jobMatches.emptyTitle')}
            text={t('jobMatches.emptyText')}
          />
        )}

        {m.data && m.data.length > 0 && (
          <>
            <p className="mb-3 text-slate-600">
              {t('jobMatches.eligibleCount', { count: m.data.length })}
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {m.data.map((w) => (
                <WorkerCard
                  key={w.workerId}
                  worker={w}
                  job={job.data ?? undefined}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
