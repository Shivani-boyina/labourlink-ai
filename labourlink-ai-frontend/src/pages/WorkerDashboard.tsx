
import {
  Briefcase,
  CheckCircle2,
  Clock,
  ExternalLink,
  Hammer,
  HardHat,
  IndianRupee,
  LogOut,
  MapPin,
  Search,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MatchSummary from '../components/MatchSummary';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { getMyWorker } from '../services/workerService';
import { getJobs, getMyRecommendations } from '../services/jobService';
import { applyForJob, getMyApplications } from '../services/applicationService';
import { getAllocations } from '../services/allocationService';
import { getToken } from '../utils/storage';
import { useFetch } from '../utils/useFetch';
import { useAuth } from '../context/AuthContext';

export default function WorkerDashboard() {
  const { t } = useTranslation();
  const { logout: clearAuth } = useAuth();
  const token = getToken();
  const [applying, setApplying] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState<number[]>([]);
  const [applyFailed, setApplyFailed] = useState(false);
  const [employmentDays, setEmploymentDays] = useState<7 | 30>(7);

  const prof = useFetch(
    async () => {
      if (!token) return null;
      return getMyWorker();
    },
    [token]
  );

  const worker = prof.data;
  const profileCompletion = worker
    ? Math.round(([worker.name, worker.phone, worker.skill, worker.location, worker.experience !== null, worker.availability !== null]
        .filter(Boolean).length / 6) * 100)
    : 0;

  const jobs = useFetch(() => worker ? getJobs() : Promise.resolve([]), [worker?.workerId]);
  const applications = useFetch(
    () => worker ? getMyApplications() : Promise.resolve([]),
    [worker?.workerId]
  );
  const recommendations = useFetch(
    () => worker ? getMyRecommendations() : Promise.resolve([]),
    [worker?.workerId]
  );
  const recommended = recommendations.data ?? [];
  const allocations = useFetch(
    () => worker ? getAllocations('worker') : Promise.resolve([]),
    [worker?.workerId]
  );
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const scheduledDays = Array.from({ length: employmentDays }, (_, offset) => {
    const day = new Date(`${today}T00:00:00Z`);
    day.setUTCDate(day.getUTCDate() - offset);
    return day.toISOString().slice(0, 10);
  }).filter(day => allocations.data?.some(allocation =>
    (allocation.status === 'ACTIVE' || allocation.status === 'COMPLETED') &&
    allocation.startDate && allocation.endDate &&
    allocation.startDate <= day && allocation.endDate >= day
  )).length;
  const employmentPercentage = new Intl.NumberFormat(undefined, {
    style: 'percent', maximumFractionDigits: 1,
  }).format(scheduledDays / employmentDays);
  const applied = new Set([...submitted, ...(applications.data ?? []).map((application) => application.jobId)]);

  async function apply(jobId: number) {
    setApplying(jobId);
    setApplyFailed(false);
    try {
      await applyForJob(jobId);
      setSubmitted((previous) => [...previous, jobId]);
      applications.reload();
    } catch {
      setApplyFailed(true);
      applications.reload();
    } finally {
      setApplying(null);
    }
  }

  function logout() {
    clearAuth();
    window.location.href = '/worker/login';
  }

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card border-2 border-slate-200 bg-white p-8 text-center space-y-4 shadow-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <HardHat size={28} aria-hidden />
          </div>

          <h1 className="text-2xl font-extrabold text-slate-900">
            {t('workerDashboard.loginRequired')}
          </h1>

          <p className="text-base text-slate-600">
            {t('workerDashboard.loginMessage')}
          </p>

          <div className="pt-2 flex flex-col gap-3">
            <Link to="/worker/login" className="btn-primary w-full">
              {t('workerDashboard.workerLogin')}
            </Link>

            <Link to="/worker/register" className="btn-outline w-full">
              {t('workerDashboard.register')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-10">
      {prof.loading && (
        <LoadingSpinner label={t('workerDashboard.loadingProfile')} />
      )}

      {prof.error && (
        <ErrorMessage message={prof.error} onRetry={prof.reload} />
      )}

      {!prof.loading && !prof.error && !worker && (
        <EmptyState
          title={t('workerDashboard.profileNotFound')}
          text={t('workerDashboard.profileError')}
          action={
            <button type="button" className="btn-primary" onClick={logout}>
              {t('workerDashboard.loginAgain')}
            </button>
          }
        />
      )}

      {worker && (
        <>
          {/* Header Banner */}
          <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-900 to-blue-800 p-6 md:p-8 text-white shadow-md">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-700/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-200">
                  <HardHat size={14} aria-hidden />
                  <span>{t('workerDashboard.badge')}</span>
                </span>
                <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl text-white">
                  {t('workerDashboard.welcome')}, {worker.name}
                </h1>
                <p className="mt-1 text-base text-blue-100">
                  {t('workerDashboard.subtitle')}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  to="/worker/profile"
                  className="btn bg-white/10 hover:bg-white/20 text-white border border-white/30 text-sm font-semibold !py-2.5"
                >
                  <User size={16} aria-hidden />
                  <span>{t('myProfile')}</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="btn bg-white/10 hover:bg-white/20 text-white border border-white/30 text-sm font-semibold !py-2.5"
                >
                  <LogOut size={16} aria-hidden />
                  <span>{t('workerDashboard.logout')}</span>
                </button>
              </div>
            </div>

            {/* Profile Completion Bar */}
            <div className="mt-6 rounded-xl bg-blue-950/50 p-4 border border-blue-700/50">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-blue-100">
                  {t('workerDashboard.profileStatus')}
                </span>
                <span className="font-bold text-white">{t('workerDashboard.percentComplete', { percent: profileCompletion })}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-blue-900" role="progressbar" aria-valuenow={profileCompletion} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-300"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>
            </div>
          </div>

          {/* Key Profile Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="card border-2 border-slate-200/90 bg-white p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Hammer size={16} className="text-blue-600" aria-hidden />
                <span>{t('workerDashboard.skill')}</span>
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">{t('workerRegister.skills.' + worker.skill, worker.skill)}</p>
            </div>

            <div className="card border-2 border-slate-200/90 bg-white p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <Clock size={16} className="text-blue-600" aria-hidden />
                <span>{t('workerDashboard.experience')}</span>
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900">
                {worker.experience} {t('workerDashboard.years')}
              </p>
            </div>

            <div className="card border-2 border-slate-200/90 bg-white p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <MapPin size={16} className="text-blue-600" aria-hidden />
                <span>{t('workerDashboard.location')}</span>
              </p>
              <p className="mt-2 text-2xl font-extrabold text-slate-900 truncate">{worker.location}</p>
            </div>

            <div className="card border-2 border-slate-200/90 bg-white p-5">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                <span>{t('workerDashboard.availability')}</span>
              </p>
              <div className="mt-2 flex items-center gap-2">
                {worker.availability ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-3 py-1 text-sm font-bold text-emerald-800">
                    <CheckCircle2 size={15} className="text-emerald-700" aria-hidden />
                    {t('workerDashboard.available')}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-sm font-bold text-amber-800">
                    <XCircle size={15} className="text-amber-700" aria-hidden />
                    {t('workerDashboard.notAvailable')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <section className="grid gap-4 sm:grid-cols-2">
            {(['sevenDays', 'thirtyDays'] as const).map((horizon) => (
              <article key={horizon} className="card border-2 border-slate-200 bg-white p-5">
                <h2 className="font-bold text-blue-950">{t('dashboardMatching.' + horizon)}</h2>
                <p className="mt-2 text-sm text-slate-700">{t('dashboardMatching.insufficientData')}</p>
              </article>
            ))}
          </section>

          {/* Matching Jobs for Worker */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles size={22} className="text-blue-600" aria-hidden />
                  <span>{t('dashboardMatching.jobs')}</span>
                </h2>
                <p className="text-sm text-slate-600">
                  {t('workerDashboard.matchingJobsDesc', {
                    skill: t('workerRegister.skills.' + worker.skill, worker.skill),
                    location: worker.location,
                  })}
                </p>
              </div>
            </div>

            {recommendations.loading && <LoadingSpinner label={t('workerDashboard.loadingJobs')} />}
            {recommendations.error && <ErrorMessage message={recommendations.error} onRetry={recommendations.reload} />}

            {!recommendations.loading && !recommendations.error && recommendations.data && (
              <p role="status" className="text-sm text-slate-700">
                {t('dashboardMatching.count', { count: recommended.length })}
              </p>
            )}
            {applyFailed && <p role="alert" className="text-sm text-red-700">{t('opportunity.applyFailure')}</p>}

            {!recommendations.loading && !recommendations.error && recommendations.data?.length === 0 && (
              <EmptyState
                title={t('dashboardMatching.noEligible')}
                text={t(worker.availability ? 'dashboardMatching.eligibility' : 'dashboardMatching.unavailableWorker')}
                action={
                  <Link to="/jobs" className="btn-primary">
                    <Search size={18} />
                    <span>{t('workerDashboard.findWork')}</span>
                  </Link>
                }
              />
            )}

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {recommended.map(({ job, matchingScore, recommendation, contractorName, matchingReasons }) => (
                <div key={job.jobId} className="flex flex-col gap-2">
                  <MatchSummary score={matchingScore} recommendation={recommendation} reasons={matchingReasons} />
                  <JobCard job={job} contractorName={contractorName} />
                  <button type="button" className="btn-primary"
                    disabled={applied.has(job.jobId) || applying !== null || applications.loading || !!applications.error}
                    onClick={() => void apply(job.jobId)}>
                    {t(applied.has(job.jobId) ? 'opportunity.applied' : 'opportunity.apply')}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* All Available Jobs */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase size={22} className="text-blue-600" aria-hidden />
                  <span>{t('workerDashboard.availableJobs')}</span>
                </h2>
                <p className="text-sm text-slate-600">{t('workerDashboard.allJobsDesc')}</p>
              </div>
              <Link to="/jobs" className="btn-outline !py-2 !text-sm">
                {t('workerDashboard.viewAllAndFilter')}
              </Link>
            </div>

            {jobs.loading && <LoadingSpinner label={t('workerDashboard.loadingJobs')} />}
            {jobs.error && <ErrorMessage message={jobs.error} onRetry={jobs.reload} />}

            {!jobs.loading && !jobs.error && jobs.data?.length === 0 && (
              <EmptyState
                title={t('workerDashboard.noAvailableJobs')}
                text={t('workerDashboard.noJobsMessage')}
              />
            )}

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {jobs.data?.slice(0, 6).map((job) => (
                <JobCard key={job.jobId} job={job} />
              ))}
            </div>
          </div>
          {/* Quick Actions & Recent Applications */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {t('workerDashboard.applicationSummary')}
                </h2>
                <p className="text-sm text-slate-600">{t('workerDashboard.recentApplicationsDesc')}</p>
              </div>
              <Link to="/worker/attendance" className="btn-outline !py-2 !text-sm">{t('allocation.history')}</Link>
              <Link to="/worker/replacements" className="btn-outline !py-2 !text-sm">{t('replacement.offers')}</Link>
              <Link to="/worker/reviews" className="btn-outline !py-2 !text-sm">{t('review.mine')}</Link>
              <Link to="/worker/applications" className="btn-outline !py-2 !text-sm flex items-center gap-1.5">
                <span>{t('myApplications')}</span>
                <ExternalLink size={15} aria-hidden />
              </Link>
            </div>

            {applications.loading && <LoadingSpinner label={t('workerApplications.loading')} />}
            {applications.error && <ErrorMessage message={applications.error} onRetry={applications.reload} />}

            {!applications.loading && !applications.error && (
              <div className="grid gap-4 sm:grid-cols-3">
                {applications.data?.slice(0, 3).map((application) => (
                  <Link
                    to={`/jobs/${application.jobId}`}
                    key={application.applicationId}
                    className="card card-hover border-2 border-slate-200/90 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-slate-900 line-clamp-1">{application.jobTitle}</p>
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        application.status === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : application.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {application.status ? t(`applicationStatus.${application.status.toLowerCase()}`) : t('hiringHistory.unknownStatus')}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600 flex items-center gap-1.5">
                      <MapPin size={14} className="text-blue-600" />
                      <span>{application.jobLocation}</span>
                    </p>
                    {application.wagePerDay != null && (
                      <p className="mt-1 text-sm font-bold text-blue-800 flex items-center">
                        <IndianRupee size={14} /> ₹{application.wagePerDay} {t('jobCard.perDay')}
                      </p>
                    )}
                  </Link>
                ))}

                {applications.data?.length === 0 && (
                  <div className="card col-span-full border-dashed border-2 border-slate-300 p-6 text-center text-slate-600">
                    <p className="text-base font-medium">{t('workerDashboard.noApplications')}</p>
                    <Link to="/jobs" className="btn-primary mt-3 inline-flex items-center gap-2">
                      <Search size={18} />
                      <span>{t('workerDashboard.browseOpenJobs')}</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

            <section className="space-y-2 rounded-xl bg-white p-4 border border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-blue-950">{t('workerEmployment.title')}</h3>
                <label className="flex items-center gap-2 text-sm">
                  {t('workerEmployment.period')}
                  <select value={employmentDays} className="rounded-lg border border-slate-300 bg-white p-2"
                    onChange={event => setEmploymentDays(event.target.value === '30' ? 30 : 7)}>
                    <option value={7}>{t('workerEmployment.weekly')}</option>
                    <option value={30}>{t('workerEmployment.monthly')}</option>
                  </select>
                </label>
              </div>
              {allocations.loading && <LoadingSpinner label={t('workerEmployment.loading')} />}
              {allocations.error && <ErrorMessage message={allocations.error} onRetry={allocations.reload} />}
              {!allocations.loading && !allocations.error && allocations.data && (
                <p aria-live="polite" className="text-sm text-slate-700">
                  <strong className="mr-2 text-xl text-blue-900">{employmentPercentage}</strong>
                  {t('workerEmployment.days', { count: scheduledDays, total: employmentDays })}
                </p>
              )}
              <p className="text-sm text-slate-600">{t('workerEmployment.explanation')}</p>
            </section>
        </>
      )}
    </div>
  );
}
