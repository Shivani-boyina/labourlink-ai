import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { getContractorSelections } from '../services/applicationService';
import { useFetch } from '../utils/useFetch';
import { useAuth } from '../context/AuthContext';

export default function ContractorHiringHistory() {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, reload } = useFetch(getContractorSelections, [session?.userId]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:py-12">
      <Link to="/contractor/dashboard" className="font-semibold text-blue-700">
        {t('contractorProfile.backToDashboard')}
      </Link>
      <h1 className="text-3xl font-extrabold">{t('hiringHistory.title')}</h1>
      {loading && <LoadingSpinner label={t('hiringHistory.loading')} />}
      {error && <ErrorMessage message={error} onRetry={reload} />}
      {!loading && !error && data?.length === 0 && <EmptyState title={t('hiringHistory.emptySelections')} />}
      {!loading && !error && data && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {data.map((selection) => (
            <li key={selection.applicationId} className="card space-y-2 p-5">
              <h2 className="text-lg font-bold">{selection.jobTitle}</h2>
              <p>{selection.workerName} · {t('workerRegister.skills.' + selection.workerSkill, selection.workerSkill)}</p>
              <p className="text-sm text-slate-700">{t('workerApplications.appliedOn')}: {selection.applicationDate || t('hiringHistory.unknownDate')}</p>
              <p className="text-sm text-slate-700">{t('hiringHistory.selectedOn')}: {selection.acceptedAt
                ? new Date(selection.acceptedAt).toLocaleString(i18n.language)
                : t('hiringHistory.unknownDate')}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
