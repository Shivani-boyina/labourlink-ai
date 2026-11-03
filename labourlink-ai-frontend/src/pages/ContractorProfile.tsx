
import { Building2, MapPin, Phone, Briefcase } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { getContractors } from '../services/contractorService';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../utils/useFetch';

export default function ContractorProfile() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const contractorId = session?.contractorId ?? null;

  const { data: contractors, loading, error, reload } = useFetch(
    getContractors,
    []
  );

  const contractor = contractors?.find(
    (item) => item.contractorId === contractorId
  );

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <div className="card text-center">
          <h1 className="text-2xl font-bold">
            {t('contractorProfile.loginRequired')}
          </h1>
          <p className="mt-2 text-slate-600">
            {t('contractorProfile.loginMessage')}
          </p>
          <Link to="/login" className="btn-primary mt-5 inline-block">
            {t('login')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {t('contractorProfile.title')}
        </h1>
        <p className="mt-1 text-slate-600">
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
          <div className="card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold">
                  {contractor.contractorName}
                </h2>
                <p className="mt-1 text-slate-600">
                  {t('contractorProfile.contractorId')}: {contractor.contractorId}
                </p>
              </div>
              <div className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
                {t('contractorProfile.registered')}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <Building2 size={18} aria-hidden />
                {t('contractorProfile.company')}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {contractor.companyName || t('contractorProfile.notProvided')}
              </p>
            </div>

            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <Phone size={18} aria-hidden />
                {t('contractorProfile.phone')}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {contractor.phone}
              </p>
            </div>

            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <MapPin size={18} aria-hidden />
                {t('contractorProfile.location')}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {contractor.location || t('contractorProfile.notProvided')}
              </p>
            </div>

            <div className="card">
              <p className="flex items-center gap-2 text-slate-600">
                <Briefcase size={18} aria-hidden />
                {t('contractorProfile.contractorId')}
              </p>
              <p className="mt-2 text-lg font-semibold">
                {contractor.contractorId}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/contractor/dashboard" className="btn-primary">
              {t('dashboard')}
            </Link>
            <Link to="/contractor/jobs/create" className="btn-outline">
              {t('contractorProfile.createJob')}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
