import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Hammer,
  IndianRupee,
  MapPin,
  Sparkles,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import { StatusBadge } from '../components/JobCard';
import { useAuth } from '../context/AuthContext';
import JobMatchStatus from '../components/JobMatchStatus';
import { getJob, getMyRecommendations } from '../services/jobService';
import { applyForJob, getMyApplications } from '../services/applicationService';
import { errorMessage } from '../services/api';
import { useFetch } from '../utils/useFetch';

export default function JobDetails() {
  const { id = '' } = useParams();
  const { session } = useAuth();
  return <JobDetailsContent key={id + ':' + (session?.role ?? '') + ':' + (session?.userId ?? '')} id={id} />;
}

function JobDetailsContent({ id }: { id: string }) {
  const { session } = useAuth();
  const { t } = useTranslation();
  const [applying, setApplying] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState(false);
  const [applicationError, setApplicationError] = useState<string | null>(null);

  const { data: job, loading, error, reload } = useFetch(
    () => getJob(id),
    [id]
  );
  const applications = useFetch(
    () => session?.role === 'worker' ? getMyApplications() : Promise.resolve([]),
    [session?.role, job?.jobId]
  );
  const matching = useFetch(
    () => session?.role === 'worker' ? getMyRecommendations() : Promise.resolve(null),
    [session?.role, session?.userId],
  );
  const details = matching.loading || matching.error ? null : matching.data;
  const exclusion = job && details?.excludedJobs?.[job.jobId];
  const alreadyApplied = applications.data?.some((application) => application.jobId === job?.jobId) ?? false;

  async function apply() {
    if (!job) return;
    setApplying(true);
    setApplicationError(null);
    setApplicationMessage(false);
    try {
      await applyForJob(job.jobId);
      setApplicationMessage(true);
      applications.reload();
      matching.reload();
    } catch (error) {
      setApplicationError(errorMessage(error));
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      {/* Back button */}
      <Link
        to="/jobs"
        className="mb-5 inline-flex items-center gap-2 text-base font-semibold text-blue-700 hover:text-blue-900 transition-colors"
      >
        <ArrowLeft size={18} aria-hidden />
        <span>{t('jobDetails.allJobs')}</span>
      </Link>

      {loading && (
        <LoadingSpinner label={t('jobDetails.loading')} />
      )}
      {error && (
        <ErrorMessage message={error} onRetry={reload} />
      )}

      {job && (
        <article className="card border-2 border-slate-200/90 bg-white p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200 pb-5">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
                <Briefcase size={14} aria-hidden />
                <span>{t('jobDetails.jobIdBadge', { id: job.jobId })}</span>
              </span>
              <h1 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {job.title}
              </h1>
            </div>
            <div className="self-start">
              <StatusBadge status={job.status} />
            </div>
          </div>

          {/* Prominent Daily Wage Banner */}
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100/60 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                {t('jobDetails.dailyWage')}
              </span>
              <div className="flex items-center text-3xl font-black text-blue-900 mt-0.5">
                <IndianRupee size={28} className="text-blue-700 stroke-[2.5]" aria-hidden />
                <span>{job.wagePerDay}</span>
                <span className="ml-1.5 text-base font-bold text-blue-700">{t('jobCard.perDay')}</span>
              </div>
            </div>

            <div className="text-sm text-slate-600 sm:text-right">
              <span className="font-semibold text-slate-800">{t('jobDetails.dailyWageBadge')}</span>
              <p className="text-xs text-slate-500">{t('jobDetails.paidDirectly')}</p>
            </div>
          </div>

          {/* Key Job Specifications Grid */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-3">{t('jobDetails.keyDetailsHeading')}</h2>
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Hammer size={15} className="text-blue-600" aria-hidden />
                  <span>{t('jobDetails.skill')}</span>
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {t(`workerRegister.skills.${job.requiredSkill}`, job.requiredSkill)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <MapPin size={15} className="text-blue-600" aria-hidden />
                  <span>{t('jobDetails.location')}</span>
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {job.location}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Users size={15} className="text-blue-600" aria-hidden />
                  <span>{t('jobDetails.workersNeeded')}</span>
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {job.requiredWorkers} {t('jobCard.workersNeeded')}
                </p>
              </div>

              {job.startDate && job.endDate && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('allocation.schedule')}</p>
                  <p className="mt-1.5 text-lg font-bold text-slate-900">{job.startDate} – {job.endDate}</p>
                </div>
              )}
              {job.durationDays != null && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Calendar size={15} className="text-blue-600" aria-hidden />
                    <span>{t('jobDetails.duration')}</span>
                  </p>
                  <p className="mt-1.5 text-lg font-bold text-slate-900">
                    {t('jobDetails.daysOfWork', { count: job.durationDays })}
                  </p>
                </div>
              )}

              {job.minimumExperience != null && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Clock size={15} className="text-blue-600" aria-hidden />
                    <span>{t('jobDetails.minimumExperience')}</span>
                  </p>
                  <p className="mt-1.5 text-lg font-bold text-slate-900">
                    {t('jobDetails.yearsMinimum', { count: job.minimumExperience })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="border-t border-slate-200 pt-5">
            <h2 className="text-lg font-bold text-slate-900 mb-2">{t('jobDetails.descriptionHeading')}</h2>
            <p className="whitespace-pre-line text-base leading-relaxed text-slate-700 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
              {job.description || t('jobDetails.noDescription')}
            </p>
          </div>

          {session?.role === 'worker' && (
            <div>
              {matching.error && <ErrorMessage message={matching.error} onRetry={matching.reload} />}
              <JobMatchStatus job={job} details={details} loading={matching.loading} />
            </div>
          )}

          {/* Worker Application Action Box */}
          {session?.role === 'worker' && job.status?.toUpperCase() === 'OPEN' && (
            <div className="border-t border-slate-200 pt-6">
              {alreadyApplied ? (
                <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/80 p-5 text-emerald-900 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={24} className="text-emerald-700 shrink-0" aria-hidden />
                    <div>
                      <p className="text-base font-bold">{t('jobDetails.appliedSuccessHeading')}</p>
                      <p className="text-sm text-emerald-800">
                        {t('jobDetails.appliedSuccessDesc')}
                      </p>
                    </div>
                  </div>
                  <Link
                    to="/worker/applications"
                    className="btn-outline !bg-white !text-emerald-800 !border-emerald-600 text-sm font-semibold inline-flex items-center gap-1.5"
                  >
                    <span>{t('jobDetails.viewApplications')}</span>
                  </Link>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/60 p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-blue-950">{t('jobDetails.readyToTakeUp')}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {t('jobDetails.applicationNote')}
                    </p>
                  </div>

                  {applicationMessage && (
                    <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-100 border border-emerald-300 p-3 text-sm font-semibold text-emerald-900">
                      <CheckCircle2 size={18} className="text-emerald-700" />
                      <span>{t('jobDetails.applicationSubmitted')}</span>
                    </div>
                  )}

                  {applicationError && <ErrorMessage message={applicationError} />}
                  {applications.error && <ErrorMessage message={applications.error} onRetry={applications.reload} />}

                  <button
                    type="button"
                    disabled={applying || applications.loading || matching.loading || Boolean(applications.error || exclusion)}
                    onClick={apply}
                    className="btn-primary w-full text-lg font-bold !py-3.5 flex items-center justify-center gap-2.5 shadow-md"
                  >
                    <CheckCircle2 size={20} aria-hidden />
                    <span>{applying ? t('jobDetails.submitting') : t('jobDetails.apply')}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Guest Action Prompt */}
          {!session && job.status?.toUpperCase() === 'OPEN' && (
            <div className="border-t border-slate-200 pt-6">
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-6 text-center space-y-4">
                <h3 className="text-xl font-bold text-slate-900">{t('jobDetails.guestPromptTitle')}</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  {t('jobDetails.guestPromptDesc')}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link to="/worker/login" className="btn-primary w-full sm:w-auto">
                    {t('jobDetails.loginToApply')}
                  </Link>
                  <Link to="/worker/register" className="btn-outline w-full sm:w-auto">
                    {t('registerAsWorker')}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Contractor Owner Actions */}
          {session && session.role === 'contractor' && session.userId === job.contractorId && (
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                {t('jobDetails.contractorActionsHeading')}
              </h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/jobs/${job.jobId}/matches`}
                  className="btn-primary flex items-center gap-2"
                >
                  <Sparkles size={18} aria-hidden />
                  <span>{t('jobDetails.viewMatches')}</span>
                </Link>
                <Link
                  to={`/contractor/jobs/${job.jobId}/edit`}
                  className="btn-outline"
                >
                  <span>{t('jobDetails.editJobDetails')}</span>
                </Link>
                <Link
                  to="/contractor/dashboard#applicants"
                  className="btn-outline"
                >
                  <span>{t('jobDetails.viewApplicants')}</span>
                </Link>
              </div>
            </div>
          )}
        </article>
      )}
    </div>
  );
}
