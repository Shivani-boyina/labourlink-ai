import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Hammer, IndianRupee, MapPin, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { StatusBadge } from '../components/JobCard';
import { useAuth } from '../context/AuthContext';
import { getJob } from '../services/jobService';
import { useFetch } from '../utils/useFetch';

export default function JobDetails() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  const { t } = useTranslation();

  const { data: job, loading, error, reload } = useFetch(
    () => getJob(id),
    [id]
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        to="/jobs"
        className="mb-4 inline-flex items-center gap-1 font-semibold text-navy-700"
      >
        <ArrowLeft size={18} aria-hidden /> {t('jobDetails.allJobs')}
      </Link>

      {loading && (
        <LoadingSpinner label={t('jobDetails.loading')} />
      )}
      {error && (
        <ErrorMessage message={error} onRetry={reload} />
      )}

      {job && (
        <article className="card">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-3xl font-bold">
              {job.title}
            </h1>
            <StatusBadge status={job.status} />
          </div>

          <p className="mt-4 whitespace-pre-line text-slate-700">
            {job.description || t('jobDetails.noDescription')}
          </p>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-paper p-4">
              <dt className="flex items-center gap-2 text-sm text-slate-600">
                <Hammer size={16} aria-hidden /> {t('jobDetails.skill')}
              </dt>
              <dd className="text-lg font-semibold">
                {job.requiredSkill}
              </dd>
            </div>

            <div className="rounded-xl bg-paper p-4">
              <dt className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin size={16} aria-hidden /> {t('jobDetails.location')}
              </dt>
              <dd className="text-lg font-semibold">
                {job.location}
              </dd>
            </div>

            <div className="rounded-xl bg-paper p-4">
              <dt className="flex items-center gap-2 text-sm text-slate-600">
                <IndianRupee size={16} aria-hidden /> {t('jobDetails.dailyWage')}
              </dt>
              <dd className="text-lg font-semibold">
                ₹{job.wagePerDay}/day
              </dd>
            </div>

            <div className="rounded-xl bg-paper p-4">
              <dt className="flex items-center gap-2 text-sm text-slate-600">
                <Users size={16} aria-hidden /> {t('jobDetails.workersNeeded')}
              </dt>
              <dd className="text-lg font-semibold">
                {job.requiredWorkers}
              </dd>
            </div>
          </dl>

          <div className="mt-6 space-y-2">
            <button
              type="button"
              disabled
              className="btn-accent w-full sm:w-auto"
            >
              {t('jobDetails.apply')}
            </button>
            <p className="text-sm text-slate-600">
              {t('jobDetails.applicationNote')}
            </p>
          </div>

          {session && session.role === 'contractor' && session.userId === job.contractorId && (
            <Link
              to={`/jobs/${job.jobId}/matches`}
              className="btn-primary mt-5"
            >
              {t('jobDetails.viewMatches')}
            </Link>
          )}
        </article>
      )}
    </div>
  );
}
