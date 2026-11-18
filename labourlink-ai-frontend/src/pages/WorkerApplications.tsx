import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, CheckCircle2, Clock, IndianRupee, MapPin, Search, XCircle } from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { getArchivedApplications, getMyApplications } from '../services/applicationService';
import { useFetch } from '../utils/useFetch';
import { useAuth } from '../context/AuthContext';

export default function WorkerApplications() {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, reload } = useFetch(getMyApplications, [session?.userId]);
  const archive = useFetch(getArchivedApplications, [session?.userId]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:py-12 space-y-8">
      <div>
        <Link
          to="/worker/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-base font-semibold text-blue-700 hover:text-blue-900"
        >
          <ArrowLeft size={18} aria-hidden />
          <span>{t('workerApplications.backToDashboard')}</span>
        </Link>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
          {t('myApplications')}
        </h1>
        <p className="mt-1 text-base text-slate-600">
          {t('workerApplications.subtitle')}
        </p>
        <Link to="/worker/attendance" className="btn-outline mt-4 inline-flex">{t('allocation.history')}</Link>
      </div>

      {loading && <LoadingSpinner label={t('workerApplications.loading')} />}
      {error && <ErrorMessage message={error} onRetry={reload} />}

      {!loading && !error && data?.length === 0 && (
        <EmptyState
          title={t('workerApplications.emptyTitle')}
          text={t('workerApplications.emptyText')}
          action={
            <Link to="/jobs" className="btn-primary flex items-center gap-2">
              <Search size={18} aria-hidden />
              <span>{t('findWork')}</span>
            </Link>
          }
        />
      )}

      {!loading && !error && data && data.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {data.map((application) => {
            const statusUpper = application.status?.toUpperCase();
            return (
              <article
                className="card border-2 border-slate-200/90 bg-white p-5 flex flex-col justify-between gap-4"
                key={application.applicationId}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-xl font-bold text-slate-900 line-clamp-2">
                      {application.jobTitle}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                        statusUpper === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : statusUpper === 'REJECTED'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {statusUpper === 'ACCEPTED' && <CheckCircle2 size={13} />}
                      {statusUpper === 'REJECTED' && <XCircle size={13} />}
                      {statusUpper === 'PENDING' && <Clock size={13} />}
                      <span>{statusUpper
                        ? t(`applicationStatus.${statusUpper.toLowerCase()}`, { defaultValue: statusUpper })
                        : t('hiringHistory.unknownStatus')}</span>
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <p className="flex items-center gap-2 font-semibold text-slate-800">
                      <MapPin size={16} className="text-blue-600" aria-hidden />
                      <span>{application.jobLocation}</span>
                    </p>
                    {application.wagePerDay != null && (
                      <p className="flex items-center gap-2 font-bold text-blue-900">
                        <IndianRupee size={16} className="text-blue-700" aria-hidden />
                        <span>₹{application.wagePerDay} {t('jobCard.perDay')}</span>
                      </p>
                    )}
                    <p className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                      <Calendar size={14} className="text-slate-400" aria-hidden />
                      <span>{t('workerApplications.appliedOn')}: {application.applicationDate || t('hiringHistory.unknownDate')}</span>
                    </p>
                    {statusUpper === 'ACCEPTED' && (
                      <p>{t('hiringHistory.selectedOn')}: {application.acceptedAt
                        ? new Date(application.acceptedAt).toLocaleString(i18n.language)
                        : t('hiringHistory.unknownDate')}</p>
                    )}
                  </div>

                  {statusUpper === 'ACCEPTED' && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs font-medium text-emerald-900">
                      {application.allocationStatus && application.allocationStatus !== 'ACTIVE'
                        ? t('allocation.status.' + application.allocationStatus)
                        : t('workerApplications.acceptedNotice')}
                    </div>
                  )}
                </div>

                <Link
                  to={`/jobs/${application.jobId}`}
                  className="btn-outline w-full text-center text-sm font-semibold !py-2.5"
                >
                  {t('workerApplications.viewJob')}
                </Link>
              </article>
            );
          })}
        </div>
      )}
      <section className="space-y-4" aria-labelledby="archived-applications-heading">
        <h2 id="archived-applications-heading" className="text-2xl font-bold">{t('hiringHistory.archive')}</h2>
        {archive.loading && <LoadingSpinner label={t('hiringHistory.loading')} />}
        {archive.error && <ErrorMessage message={archive.error} onRetry={archive.reload} />}
        {!archive.loading && !archive.error && archive.data?.length === 0 && <EmptyState title={t('hiringHistory.emptyArchive')} />}
        {!archive.loading && !archive.error && archive.data && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {archive.data.map((application) => (
              <li className="card space-y-2 p-5" key={application.applicationId}>
                <h3 className="font-bold">{application.jobTitle || t('hiringHistory.archivedJob', { id: application.jobId })}</h3>
                <p>{application.status
                  ? t(`applicationStatus.${application.status.toLowerCase()}`, { defaultValue: application.status })
                  : t('hiringHistory.unknownStatus')}</p>
                <p>{t('workerApplications.appliedOn')}: {application.applicationDate || t('hiringHistory.unknownDate')}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
