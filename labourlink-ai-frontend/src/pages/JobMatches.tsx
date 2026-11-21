
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import WorkerCard from '../components/WorkerCard';
import { getJob, getMatches } from '../services/jobService';
import { useFetch } from '../utils/useFetch';
import MatchSummary from '../components/MatchSummary';

export default function JobMatches() {
  const { id = '' } = useParams();
  return <MatchesForJob key={id} id={id} />;
}

function MatchesForJob({ id }: { id: string }) {
  const { t } = useTranslation();

  const job = useFetch(() => getJob(id), [id]);
  const m = useFetch(() => getMatches(id), [id]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-6">
      <Link
        to="/contractor/dashboard"
        className="inline-flex items-center gap-2 text-base font-semibold text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} aria-hidden />
        <span>{t('jobMatches.dashboard')}</span>
      </Link>

      <div>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
          {t('jobMatches.title')}
        </h1>

        {job.data && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-base text-slate-700">
            <span>{t('jobMatches.for')}:</span>
            <strong className="text-slate-900">{job.data.title}</strong>
            <span className="rounded-lg bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-800 border border-blue-200">
              {t('workerRegister.skills.' + job.data.requiredSkill, job.data.requiredSkill)}
            </span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-200">
              {job.data.location}
            </span>
          </div>
        )}

        <div className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-900 border border-blue-200">
          <CheckCircle2 size={15} className="text-blue-600" aria-hidden />
          <span>{t('mlMatching.summary')}</span>
        </div>
      </div>

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
            action={
              <Link to="/workers/search" className="btn-primary">
                <span>{t('jobMatches.browseAllWorkers')}</span>
              </Link>
            }
          />
        )}

        {!m.loading && !m.error && m.data && m.data.length > 0 && (
          <>
            <p className="mb-4 text-base font-semibold text-slate-700">
              {t('jobMatches.eligibleCount', { count: m.data.length })}
            </p>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {m.data.map((w) => (
                <div key={w.workerId} className="space-y-2">
                  <MatchSummary skill={w.skillMatch} eligibility={t('dashboardMatching.eligible')}
                    score={w.matchingScore} recommendation={w.recommendation} reasons={w.matchingReasons} />
                  <WorkerCard worker={w} job={job.data ?? undefined} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
