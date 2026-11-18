
import { ArrowLeft, Building2, MapPin, Phone, Briefcase, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { getMyContractor, updateMyContractorRegion } from '../services/contractorService';
import WorkProfileEditor from '../components/WorkProfileEditor';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../utils/useFetch';

export default function ContractorProfile() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data: contractor, loading, error, reload } = useFetch(
    getMyContractor,
    [session?.userId]
  );

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="card border-2 border-slate-200 bg-white p-8 text-center space-y-4 shadow-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <Building2 size={28} aria-hidden />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            {t('contractorProfile.loginRequired')}
          </h1>
          <p className="text-base text-slate-600">
            {t('contractorProfile.loginMessage')}
          </p>
          <div className="pt-2">
            <Link to="/login" className="btn-primary w-full inline-block">
              {t('login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12 space-y-6">
      <Link
        to="/contractor/dashboard"
        className="inline-flex items-center gap-2 text-base font-semibold text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} aria-hidden />
        <span>{t('contractorProfile.backToDashboard')}</span>
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-slate-900">
          {t('contractorProfile.title')}
        </h1>
        <p className="text-base text-slate-600">
          {t('contractorProfile.subtitle')}
        </p>
      </div>

      {loading && (
        <LoadingSpinner label={t('contractorProfile.loading')} />
      )}

      {error && (
        <ErrorMessage message={error} onRetry={reload} />
      )}

      {!loading && !error && !contractor && (
        <EmptyState
          title={t('contractorProfile.notFound')}
          text={t('contractorProfile.notFoundMessage')}
        />
      )}

      {contractor && (
        <>
          <div className="card border-2 border-slate-200/90 bg-white p-6 md:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3.5">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 font-extrabold text-xl">
                  {contractor.contractorName.charAt(0).toUpperCase()}
                </span>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    {contractor.contractorName}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {t('contractorProfile.contractorId')}: #{contractor.contractorId}
                  </p>
                </div>
              </div>

              <div className="rounded-full bg-emerald-100 border border-emerald-300 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-800 self-start sm:self-auto">
                {t('contractorProfile.registered')}
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Building2 size={15} className="text-blue-600" aria-hidden />
                  <span>{t('contractorProfile.company')}</span>
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {contractor.companyName || t('contractorProfile.notProvided')}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Phone size={15} className="text-blue-600" aria-hidden />
                  <span>{t('contractorProfile.phone')}</span>
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {contractor.phone}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <MapPin size={15} className="text-blue-600" aria-hidden />
                  <span>{t('contractorProfile.location')}</span>
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {contractor.location || t('contractorProfile.notProvided')}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Briefcase size={15} className="text-blue-600" aria-hidden />
                  <span>{t('contractorProfile.accountType')}</span>
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {t('contractorProfile.registeredContractor')}
                </p>
              </div>
            </div>

            <WorkProfileEditor key={contractor.contractorId} initial={contractor}
              save={({ state, district }) => updateMyContractorRegion({ state, district })} />
            <div className="mt-8 flex flex-wrap gap-3 border-t border-slate-100 pt-6">
              <Link to="/contractor/dashboard" className="btn-primary">
                {t('dashboard')}
              </Link>
              <Link to="/contractor/jobs/create" className="btn-outline flex items-center gap-2">
                <Plus size={18} aria-hidden />
                <span>{t('contractorProfile.createJob')}</span>
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
