import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Edit,
  Eye,
  EyeOff,
  Hammer,
  IndianRupee,
  MapPin,
  Phone,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  XCircle,
} from 'lucide-react';
import MatchSummary from '../components/MatchSummary';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { closeJob, deleteJob, getJobs, getMatches } from '../services/jobService';
import { errorMessage } from '../services/api';
import { useFetch } from '../utils/useFetch';
import { getJobApplicants, updateApplicationStatus } from '../services/applicationService';
import { getAllocations } from '../services/allocationService';
import type { WorkerMatch } from '../types/Worker';
import type { ApplicationRecord } from '../services/applicationService';

function Applicants({ jobId, onChanged }: { jobId: number; onChanged: () => void }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const { data, loading, error, reload } = useFetch(
    () => expanded ? getJobApplicants(jobId) : Promise.resolve([] as ApplicationRecord[]),
    [jobId, expanded]
  );

  async function update(applicationId: number, status: string, workerName: string) {
    setActionError(null);
    setActionSuccess(null);
    setUpdatingId(applicationId);
    try {
      await updateApplicationStatus(applicationId, status);
      setActionSuccess(t('contractorDashboard.workerStatusUpdated', { name: workerName, status: t(status === 'ACCEPTED' ? 'contractorDashboard.acceptedStatus' : 'contractorDashboard.rejectedStatus') }));
      reload();
      onChanged();
    } catch (e) {
      setActionError(errorMessage(e));
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <button
        type="button"
        className={`w-full py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
          expanded
            ? 'bg-blue-100 text-blue-900 border border-blue-300'
            : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
        }`}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
        <span>{expanded ? t('applicants.hide') : t('applicants.view')}</span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 rounded-2xl bg-slate-50 p-3.5 border border-slate-200">
          {loading && <LoadingSpinner label={t('applicants.loading')} />}
          {error && <ErrorMessage message={error} onRetry={reload} />}
          {actionError && <ErrorMessage message={actionError} />}

          {actionSuccess && (
            <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-100 border border-emerald-300 p-2.5 text-xs font-semibold text-emerald-900">
              <CheckCircle2 size={16} className="text-emerald-700" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {!loading && !error && data?.length === 0 && (
            <div className="text-center py-4 text-sm text-slate-600">
              <p>{t('applicants.empty')}</p>
              <p className="text-xs text-slate-500 mt-1">{t('contractorDashboard.applicantsNotice')}</p>
            </div>
          )}

          {data?.map((application) => (
            <article
              className="rounded-xl border-2 border-slate-200 bg-white p-3.5 shadow-sm space-y-2.5"
              key={application.applicationId}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{application.workerName}</h4>
                  <p className="text-xs font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md inline-block mt-0.5">
                    {t('workerRegister.skills.' + application.workerSkill, application.workerSkill)}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    application.status === 'ACCEPTED'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : application.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}
                >
                  {application.status === 'ACCEPTED' && <CheckCircle2 size={12} />}
                  {application.status === 'REJECTED' && <XCircle size={12} />}
                  {application.status ? t(`applicationStatus.${application.status.toLowerCase()}`) : t('hiringHistory.unknownStatus')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 border-t border-slate-100 pt-2">
                <div>
                  <span className="text-slate-500">{t('workerRegister.experience')}:</span>{' '}
                  <strong className="text-slate-800 font-semibold">{application.workerExperience ?? t('applicants.unknown')} {t('applicants.years')}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{t('workerRegister.location')}:</span>{' '}
                  <strong className="text-slate-800 font-semibold">{application.workerLocation ?? t('applicants.unknown')}</strong>
                </div>
                <div>
                  <span className="text-slate-500">{t('applicants.availability')}:</span>{' '}
                  <strong className={`font-semibold ${application.workerAvailability === true ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {application.workerAvailability === true ? t('applicants.available') : t('applicants.notAvailable')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">{t('applicants.expectedWage')}:</span>{' '}
                  <strong className="text-slate-800 font-semibold">
                    {application.workerExpectedWagePerDay == null ? t('applicants.notProvided') : `₹${application.workerExpectedWagePerDay} ${t('jobCard.perDay')}`}
                  </strong>
                </div>
              </div>

              {/* Call Worker Button */}
              <div className="pt-1">
                <a
                  href={`tel:${application.workerPhone}`}
                  className="btn-outline w-full !py-1.5 !text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Phone size={13} aria-hidden />
                  <span>{t('contractorDashboard.callWorkerLabel', { phone: application.workerPhone })}</span>
                </a>
              </div>

              {/* Accept / Reject actions */}
              {application.status !== 'ACCEPTED' && application.status !== 'REJECTED' && (
                <div className="flex gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={updatingId === application.applicationId}
                    className="btn-success flex-1 !py-2 !text-xs font-bold flex items-center justify-center gap-1.5"
                    onClick={() => update(application.applicationId, 'ACCEPTED', application.workerName)}
                  >
                    <CheckCircle2 size={14} aria-hidden />
                    <span>{t('applicants.accept')}</span>
                  </button>

                  <button
                    type="button"
                    disabled={updatingId === application.applicationId}
                    className="btn-danger flex-1 !py-2 !text-xs font-bold flex items-center justify-center gap-1.5"
                    onClick={() => update(application.applicationId, 'REJECTED', application.workerName)}
                  >
                    <XCircle size={14} aria-hidden />
                    <span>{t('applicants.reject')}</span>
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContractorDashboard() {
  const { session } = useAuth();
  return <ContractorDashboardContent key={session?.userId ?? 'anonymous'} />;
}

function ContractorDashboardContent() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const cid = session?.userId ?? null;
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, loading, error, reload } = useFetch(async () => {
    if (cid === null) return { mine: [], metrics: null, byJob: new Map<number, WorkerMatch[] | null>() };
    const [all, allocations] = await Promise.all([getJobs(), getAllocations('contractor').catch(() => null)]);
    const mine = all.filter((j) => j.contractorId === cid);
    const details = await Promise.all(mine.map(async (job) => {
      const [matches, applicants] = await Promise.all([
        job.status?.toUpperCase() === 'OPEN' ? getMatches(String(job.jobId), true).catch(() => null) : Promise.resolve([]),
        getJobApplicants(job.jobId).catch(() => null),
      ]);
      return { jobId: job.jobId, matches, applicants };
    }));
    const applicantLists = details.map((detail) => detail.applicants);
    const occupied = applicantLists.map((list) =>
      list?.filter((app) => app.status === 'ACCEPTED' && app.allocationStatus !== 'CANCELLED').length ?? 0);
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const metrics = {
      matches: details.every((detail) => detail.matches !== null)
        ? new Set(details.flatMap((detail) => detail.matches ?? []).map((worker) => worker.workerId)).size : null,
      hired: applicantLists.every((list) => list !== null)
        ? new Set(applicantLists.flatMap((list) => list ?? []).filter((app) =>
            app.status === 'ACCEPTED' && app.allocationStatus !== 'CANCELLED').map((app) => app.workerId)).size : null,
      working: allocations === null ? null : new Set(allocations.filter((row) => row.status === 'ACTIVE' &&
        row.startDate && row.endDate && row.startDate <= today && row.endDate >= today).map((row) => row.workerId)).size,
      completed: allocations === null ? null : new Set(allocations.filter((row) =>
        row.status === 'COMPLETED').map((row) => row.workerId)).size,
      pending: applicantLists.every((list) => list !== null)
        ? applicantLists.reduce((sum, list) => sum + (list?.filter((app) => app.status === 'PENDING').length ?? 0), 0) : null,
      accepted: applicantLists.every((list) => list !== null)
        ? mine.reduce((sum, job, index) => sum + (job.status === 'OPEN' ? occupied[index] : 0), 0) : null,
      positions: applicantLists.every((list) => list !== null)
        ? mine.reduce((sum, job, index) => sum + (job.status === 'OPEN' ? Math.max(0, job.requiredWorkers - occupied[index]) : 0), 0) : null,
    };
    return { mine, metrics, byJob: new Map(details.map((detail) => [detail.jobId, detail.matches])) };
  }, [cid]);

  async function remove(id: number) {
    if (!window.confirm(t('contractorDashboard.deleteConfirm'))) return;
    setActionError(null);
    try { await deleteJob(id); reload(); } catch (e) { setActionError(errorMessage(e)); }
  }

  async function close(id: number) {
    if (!window.confirm(t('contractorDashboard.closeConfirm'))) return;
    setActionError(null);
    try { await closeJob(id); reload(); } catch (e) { setActionError(errorMessage(e)); }
  }

  const jobs = data?.mine ?? [];
  const stats = [
    { label: t('contractorDashboard.jobsPosted'), value: jobs.length, icon: Briefcase },
    { label: t('contractorDashboard.openJobs'), value: jobs.filter((j) => j.status?.toUpperCase() === 'OPEN').length, icon: CheckCircle2 },
    { label: t('contractorDashboard.closedJobs'), value: jobs.filter((j) => j.status?.toUpperCase() === 'CLOSED').length, icon: XCircle },
    { label: t('contractorDashboard.workersMatched'), value: data?.metrics?.matches ?? '-', icon: Sparkles },
    { label: t('contractorDashboard.pendingApplicants'), value: data?.metrics?.pending ?? '-', icon: Clock },
    { label: t('contractorDashboard.acceptedWorkers'), value: data?.metrics?.accepted ?? '-', icon: UserCheck },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-10">
      {/* Header Banner */}
      <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-r from-slate-900 to-blue-950 p-6 md:p-8 text-white shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-700/80 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-200">
              <Building2 size={14} aria-hidden />
              <span>{t('contractorDashboard.badge')}</span>
            </span>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl text-white">
              {t('contractorDashboard.welcome')}, {session?.name ?? t('contractorDashboard.contractor')}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              <span>{t('contractorDashboard.phone')}: {session?.phone}</span>
              {cid !== null && <span> &middot; {t('contractorDashboard.contractorId')}: #{cid}</span>}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/contractor/analytics" className="btn bg-white/10 text-white border border-white/30 !py-3">
              {t('analytics.nav', { defaultValue: 'Employment analytics' })}
            </Link>
            <Link to="/contractor/hiring-history" className="btn bg-white/10 text-white border border-white/30 !py-3">
              {t('hiringHistory.title')}
            </Link>
            <Link to="/contractor/allocations" className="btn bg-white/10 text-white border border-white/30 !py-3">
              {t('allocation.manage')}
            </Link>
            <Link to="/contractor/replacements" className="btn bg-white/10 text-white border border-white/30 !py-3">
              {t('replacement.manage')}
            </Link>
            <Link to="/contractor/reviews" className="btn bg-white/10 text-white border border-white/30 !py-3">
              {t('review.manage')}
            </Link>
            <Link
              to="/contractor/jobs/create"
              className="btn-accent !bg-blue-600 hover:!bg-blue-500 text-white font-bold !py-3 flex items-center gap-2 shadow-md"
            >
              <Plus size={18} aria-hidden />
              <span>{t('contractorDashboard.createJob')}</span>
            </Link>

            <Link
              to="/workers/search"
              className="btn bg-white/10 hover:bg-white/20 text-white border border-white/30 text-sm font-semibold !py-3 flex items-center gap-2"
            >
              <Search size={18} aria-hidden />
              <span>{t('nav.findWorkers')}</span>
            </Link>
          </div>
        </div>
      </div>

      <section id="employment-overview" className="card bg-blue-50 p-5 space-y-3">
        <h2 className="text-lg font-bold text-blue-950">{t('employmentOverview.title')}</h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {([
            ['available', data?.metrics?.matches],
            ['hired', data?.metrics?.hired],
            ['working', data?.metrics?.working],
            ['completed', data?.metrics?.completed],
          ] as const).map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-blue-950">{t(`employmentOverview.${label}`)}</dt>
              <dd className="text-xl font-bold text-blue-950">{value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </section>

      {cid === null && (
        <div className="mt-4">
          <ErrorMessage message={t('contractorDashboard.profileMissing')} />
        </div>
      )}

      {/* Metrics Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card border-2 border-slate-200/90 bg-white p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
              <p className="font-display text-3xl font-extrabold text-blue-950 mt-1">
                {loading ? '...' : value}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Icon size={22} aria-hidden />
            </span>
          </div>
        ))}
      </div>

      <section aria-labelledby="recommended-workers" className="space-y-4">
        <h2 id="recommended-workers" className="text-2xl font-bold text-slate-900">
          {t('dashboardMatching.workers')}
        </h2>
        {loading && <LoadingSpinner label={t('contractorDashboard.loadingJobs')} />}
        {!loading && !error && !jobs.some((job) => job.status?.toUpperCase() === 'OPEN') && (
          <p className="text-sm text-slate-700">{t('dashboardMatching.noOpenJobs')}</p>
        )}
        {!loading && !error && jobs.filter((job) => job.status?.toUpperCase() === 'OPEN').map((job) => {
          const matches = data?.byJob.get(job.jobId);
          return (
            <article key={job.jobId} className="card space-y-3 p-4">
              <h3 className="font-bold text-blue-950">{job.title}</h3>
              {matches == null && <ErrorMessage message={t('dashboardMatching.workerLoadFailed')} onRetry={reload} />}
              {matches?.length === 0 && <p className="text-sm text-slate-700">{t('dashboardMatching.noWorkers')}</p>}
              {!!matches?.length && (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {matches.slice(0, 3).map((worker) => (
                      <div key={worker.workerId} className="space-y-2 rounded-xl border border-slate-200 p-3">
                        <h4 className="font-bold text-slate-900">{worker.name}</h4>
                        <p className="text-sm text-slate-700">
                          {t('workerRegister.skills.' + worker.skill, worker.skill)} · {worker.experience ?? '—'} {t('workerDashboard.years')} · {worker.location}
                        </p>
                        <MatchSummary score={worker.matchingScore} recommendation={worker.recommendation} reasons={worker.matchingReasons} />
                      </div>
                    ))}
                  </div>
                  <Link className="btn-outline" to={`/jobs/${job.jobId}/matches`}>
                    {t('employmentOverview.viewMatches')}
                  </Link>
                </>
              )}
            </article>
          );
        })}
      </section>

      {/* My Jobs Section */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <h2 id="my-jobs" className="text-2xl font-bold text-slate-900 scroll-mt-24">
              {t('contractorDashboard.myJobs')}
            </h2>
            <p className="text-sm text-slate-600">{t('contractorDashboard.myJobsSubtitle')}</p>
          </div>

          <Link to="/contractor/jobs/create" className="btn-primary !py-2 !text-sm flex items-center gap-1.5">
            <Plus size={16} aria-hidden />
            <span>{t('contractorDashboard.postAnotherJob')}</span>
          </Link>
        </div>

        {actionError && <ErrorMessage message={actionError} />}
        {loading && <LoadingSpinner label={t('contractorDashboard.loadingJobs')} />}
        {error && <ErrorMessage message={error} onRetry={reload} />}

        {!loading && !error && jobs.length === 0 && (
          <EmptyState
            title={t('contractorDashboard.noJobs')}
            text={t('contractorDashboard.noJobsMessage')}
            action={
              <Link to="/contractor/jobs/create" className="btn-primary">
                <Plus size={18} aria-hidden />
                <span>{t('contractorDashboard.createJob')}</span>
              </Link>
            }
          />
        )}

        <section id="applicants" className="scroll-mt-24">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {jobs.map((j) => (
              <div
                key={j.jobId}
                className="flex flex-col justify-between rounded-2xl border-2 border-slate-200/90 bg-white p-5 shadow-card"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-slate-900 line-clamp-2">{j.title}</h3>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                        j.status?.toUpperCase() === 'OPEN'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-300'
                      }`}
                    >
                      {t('jobStatus.' + (j.status?.toLowerCase() || 'unknown'), j.status)}
                    </span>
                  </div>

                  <div className="rounded-xl bg-blue-50/70 p-3 text-sm text-slate-700 space-y-1">
                    <p className="flex items-center gap-1.5 font-bold text-blue-900">
                      <IndianRupee size={15} className="text-blue-700" /> ₹{j.wagePerDay} {t('jobCard.perDay')}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Hammer size={14} className="text-blue-600" /> {t('workerRegister.skills.' + j.requiredSkill, j.requiredSkill)} &middot; {t('contractorDashboard.workersNeededCount', { count: j.requiredWorkers })}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin size={14} className="text-blue-600" /> {j.location}
                    </p>
                  </div>

                  {/* Actions for this Job */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <Link
                      to={`/jobs/${j.jobId}/matches`}
                      className="btn-outline !py-2 !text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Sparkles size={13} aria-hidden />
                      <span>{data?.byJob.get(j.jobId) == null
                        ? t('employmentOverview.viewMatches')
                        : t('contractorDashboard.matchingCount', { count: data.byJob.get(j.jobId)?.length ?? 0 })}</span>
                    </Link>
                    {data?.byJob.get(j.jobId)?.[0]?.recommendation?.matchPercentage != null && (
                      <p className="col-span-2 text-blue-900">{t('employmentOverview.topMatch', {
                        score: data.byJob.get(j.jobId)?.[0]?.recommendation?.matchPercentage,
                      })}</p>
                    )}

                    <Link
                      to={`/contractor/jobs/${j.jobId}/edit`}
                      className="btn-outline !py-2 !text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Edit size={13} aria-hidden />
                      <span>{t('contractorDashboard.edit')}</span>
                    </Link>

                    <button
                      type="button"
                      disabled={j.status?.toUpperCase() === 'CLOSED'}
                      onClick={() => close(j.jobId)}
                      className="btn-outline !py-2 !text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <XCircle size={13} aria-hidden />
                      <span>{t('contractorDashboard.closeJob')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => remove(j.jobId)}
                      className="btn-danger !py-2 !text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <Trash2 size={13} aria-hidden />
                      <span>{t('contractorDashboard.delete')}</span>
                    </button>
                  </div>
                </div>

                {/* Integrated Applicants Accordion */}
                <Applicants jobId={j.jobId} onChanged={reload} />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
