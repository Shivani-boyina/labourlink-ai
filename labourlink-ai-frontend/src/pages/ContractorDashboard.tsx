
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Users } from 'lucide-react';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { deleteJob, getJobs, getMatches } from '../services/jobService';
import { errorMessage } from '../services/api';
import { useFetch } from '../utils/useFetch';

export default function ContractorDashboard() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const cid = session?.contractorId ?? null;
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, reload } = useFetch(async () => {
    const all = await getJobs();
    const mine = cid === null ? [] : all.filter((j) => j.contractorId === cid);
    const counts = await Promise.all(
      mine.map((j) =>
        getMatches(String(j.jobId))
          .then((w) => w.length)
          .catch(() => null)
      )
    );
    const matched = counts.every((c) => c !== null)
      ? (counts as number[]).reduce((a, b) => a + b, 0)
      : null;
    return { mine, matched };
  }, [cid]);

  async function remove(id: number) {
    if (!window.confirm(t('contractorDashboard.deleteConfirm'))) return;

    setActionError(null);

    try {
      await deleteJob(id);
      reload();
    } catch (e) {
      setActionError(errorMessage(e));
    }
  }

  const jobs = data?.mine ?? [];

  const stats = [
    { label: t('contractorDashboard.jobsPosted'), value: jobs.length },
    {
      label: t('contractorDashboard.openJobs'),
      value: jobs.filter((j) => j.status?.toUpperCase() === 'OPEN').length,
    },
    {
      label: t('contractorDashboard.workersMatched'),
      value: data?.matched ?? '-',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">
        {t('contractorDashboard.welcome')},{' '}
        {session?.name ?? t('contractorDashboard.contractor')}
      </h1>

      <p className="text-slate-600">
        {t('contractorDashboard.phone')}: {session?.phone}
        {cid !== null && (
          <> &middot; {t('contractorDashboard.contractorId')}: {cid}</>
        )}
      </p>

      {cid === null && (
        <div className="mt-4">
          <ErrorMessage
            message={t('contractorDashboard.profileMissing')}
          />
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-slate-600">{s.label}</p>
            <p className="font-display text-4xl font-bold text-navy-900">
              {loading ? '...' : s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/contractor/jobs/create" className="btn-accent">
          <Plus size={20} aria-hidden />
          {t('contractorDashboard.createJob')}
        </Link>

        <Link to="/jobs" className="btn-outline">
          <Users size={20} aria-hidden />
          {t('contractorDashboard.browseJobs')}
        </Link>
      </div>

      <h2 className="mt-10 text-2xl font-bold">
        {t('contractorDashboard.myJobs')}
      </h2>

      <div className="mt-4 space-y-4">
        {actionError && <ErrorMessage message={actionError} />}

        {loading && (
          <LoadingSpinner label={t('contractorDashboard.loadingJobs')} />
        )}

        {error && <ErrorMessage message={error} onRetry={reload} />}

        {!loading && !error && jobs.length === 0 && (
          <EmptyState
            title={t('contractorDashboard.noJobs')}
            text={t('contractorDashboard.noJobsMessage')}
            action={
              <Link to="/contractor/jobs/create" className="btn-primary">
                {t('contractorDashboard.createJob')}
              </Link>
            }
          />
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((j) => (
            <div key={j.jobId} className="space-y-2">
              <JobCard job={j} />

              <div className="flex gap-2">
                <Link
                  to={`/jobs/${j.jobId}/matches`}
                  className="btn-outline flex-1 !py-2"
                >
                  {t('contractorDashboard.matchingWorkers')}
                </Link>

                <button
                  type="button"
                  onClick={() => remove(j.jobId)}
                  className="btn-danger !py-2"
                >
                  {t('contractorDashboard.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
