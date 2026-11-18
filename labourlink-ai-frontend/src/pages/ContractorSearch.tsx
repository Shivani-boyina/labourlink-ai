
import { useState, type FormEvent } from 'react';
import { ArrowLeft, Building2, MapPin, Phone, RotateCcw, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { searchContractors } from '../services/contractorService';
import { useFetch } from '../utils/useFetch';

export default function ContractorSearch() {
  const { t } = useTranslation();
  const [location, setLocation] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');

  const { data, loading, error, reload } = useFetch(
    () => searchContractors(appliedLocation),
    [appliedLocation]
  );
  const contractors = data ?? [];

  function submit(e: FormEvent) {
    e.preventDefault();
    setAppliedLocation(location);
  }

  function clear() {
    setLocation('');
    setAppliedLocation('');
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12 space-y-6">
      <Link
        to="/worker/dashboard"
        className="inline-flex items-center gap-2 text-base font-semibold text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} aria-hidden />
        <span>{t('contractorSearch.backToDashboard')}</span>
      </Link>

      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
          <Building2 size={14} aria-hidden />
          <span>{t('contractorSearch.badge')}</span>
        </span>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
          {t('contractorSearch.title')}
        </h1>
        <p className="mt-1 text-base text-slate-600">
          {t('contractorSearch.subtitle')}
        </p>
      </div>

      <form
        onSubmit={submit}
        className="card border-2 border-slate-200/90 bg-white p-5 md:p-6"
        aria-label={t('contractorSearch.formLabel')}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contractor-location" className="label flex items-center gap-1.5">
              <MapPin size={16} className="text-blue-600" aria-hidden />
              <span>{t('contractorSearch.location')}</span>
            </label>
            <input
              id="contractor-location"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('contractorSearch.locationPlaceholder')}
            />
          </div>

          <div className="flex items-end gap-2.5">
            <button type="submit" className="btn-primary flex-1 !py-3 flex items-center justify-center gap-2">
              <Search size={18} aria-hidden />
              <span>{t('contractorSearch.search')}</span>
            </button>
            <button type="button" onClick={clear} className="btn-outline !py-3 flex items-center justify-center gap-1.5">
              <RotateCcw size={16} aria-hidden />
              <span>{t('contractorSearch.clear')}</span>
            </button>
          </div>
        </div>
      </form>

      <div className="mt-8">
        {loading && (
          <LoadingSpinner label={t('contractorSearch.loading')} />
        )}

        {error && (
          <ErrorMessage message={error} onRetry={reload} />
        )}

        {!loading && !error && contractors.length === 0 && (
          <EmptyState
            title={t('contractorSearch.emptyTitle')}
            text={t('contractorSearch.emptyMessage')}
            action={
              <button type="button" onClick={clear} className="btn-primary">
                <span>{t('contractorSearch.viewAllContractors')}</span>
              </button>
            }
          />
        )}

        {!loading && !error && contractors.length > 0 && (
          <>
            <p className="mb-4 text-base font-semibold text-slate-700">
              {t('contractorSearch.results', { count: contractors.length })}
            </p>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {contractors.map((contractor) => (
                <div key={contractor.contractorId} className="card border-2 border-slate-200/90 bg-white p-5 flex flex-col justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {contractor.contractorName}
                    </h2>

                    {contractor.companyName && (
                      <p className="mt-1 text-sm font-semibold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg inline-block border border-blue-200">
                        {contractor.companyName}
                      </p>
                    )}

                    <div className="mt-4 space-y-2 text-sm text-slate-700">
                      <p className="flex items-center gap-2">
                        <Phone size={15} className="text-blue-600" aria-hidden />
                        <span>{contractor.phone}</span>
                      </p>
                      {contractor.location && (
                        <p className="flex items-center gap-2">
                          <MapPin size={15} className="text-blue-600" aria-hidden />
                          <span>{contractor.location}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <a
                    href={`tel:${contractor.phone}`}
                    className="btn-outline w-full text-center text-sm font-semibold !py-2.5 flex items-center justify-center gap-2"
                  >
                    <Phone size={16} aria-hidden />
                    <span>{t('contractorSearch.callContractor')}</span>
                  </a>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
