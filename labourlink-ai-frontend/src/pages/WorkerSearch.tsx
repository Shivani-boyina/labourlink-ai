
import { useState, type FormEvent } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import WorkerCard from '../components/WorkerCard';
import { searchWorkers } from '../services/workerService';
import { useFetch } from '../utils/useFetch';
import { SKILLS } from './WorkerRegister';

export default function WorkerSearch() {
  const { t } = useTranslation();
  const [skill, setSkill] = useState('');
  const [location, setLocation] = useState('');
  const [applied, setApplied] = useState({
    skill: '',
    location: '',
  });

  const { data, loading, error, reload } = useFetch(
    () => searchWorkers(applied.skill || undefined, applied.location || undefined),
    [applied]
  );

  function submit(e: FormEvent) {
    e.preventDefault();
    setApplied({ skill, location });
  }

  function clear() {
    setSkill('');
    setLocation('');
    setApplied({ skill: '', location: '' });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">
        {t('workerSearch.title')}
      </h1>

      <p className="mt-2 text-slate-600">
        {t('workerSearch.subtitle')}
      </p>

      <form
        onSubmit={submit}
        className="card mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label={t('workerSearch.formLabel')}
      >
        <div>
          <label htmlFor="worker-skill" className="label">
            {t('workerSearch.skill')}
          </label>
          <select
            id="worker-skill"
            className="input"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
          >
            <option value="">{t('workerSearch.anySkill')}</option>
            {SKILLS.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="worker-location" className="label">
            {t('workerSearch.location')}
          </label>
          <input
            id="worker-location"
            className="input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('workerSearch.locationPlaceholder')}
          />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <button type="submit" className="btn-primary flex-1">
            <Search size={18} aria-hidden />
            {t('workerSearch.search')}
          </button>
          <button type="button" onClick={clear} className="btn-outline">
            {t('workerSearch.clear')}
          </button>
        </div>
      </form>

      <div className="mt-6">
        {loading && (
          <LoadingSpinner label={t('workerSearch.loading')} />
        )}

        {error && (
          <ErrorMessage message={error} onRetry={reload} />
        )}

        {!loading && !error && data && data.length === 0 && (
          <EmptyState
            title={t('workerSearch.emptyTitle')}
            text={t('workerSearch.emptyMessage')}
          />
        )}

        {!loading && !error && data && data.length > 0 && (
          <>
            <p className="mb-3 text-slate-600">
              {t('workerSearch.results', { count: data.length })}
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.map((worker) => (
                <WorkerCard key={worker.workerId} worker={worker} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
