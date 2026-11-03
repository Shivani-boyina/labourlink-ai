
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import JobCard from '../components/JobCard';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { searchJobs } from '../services/jobService';
import { useFetch } from '../utils/useFetch';
import { SKILLS } from './WorkerRegister';
import type { JobFilters } from '../types/Job';

export default function Jobs() {
  const { t } = useTranslation();

  const [draft, setDraft] = useState<JobFilters>({
    skill: '',
    location: '',
    minWage: '',
    maxWage: ''
  });

  const [applied, setApplied] = useState<JobFilters>({});
  const [formError, setFormError] = useState<string | null>(null);

  const { data, loading, error, reload } = useFetch(
    () => searchJobs(applied),
    [applied]
  );

  function submit(e: FormEvent) {
    e.preventDefault();

    const min = Number(draft.minWage);
    const max = Number(draft.maxWage);

    if ((draft.minWage && min < 0) || (draft.maxWage && max < 0)) {
      return setFormError(t('jobs.negativeWage'));
    }

    if (draft.minWage && draft.maxWage && min > max) {
      return setFormError(t('jobs.invalidWageRange'));
    }

    setFormError(null);
    setApplied({ ...draft });
  }

  const reset = () => {
    const empty = {
      skill: '',
      location: '',
      minWage: '',
      maxWage: ''
    };

    setDraft(empty);
    setApplied({});
    setFormError(null);
  };

  const set = (k: keyof JobFilters) =>
    (e: { target: { value: string } }) =>
      setDraft((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">{t('jobs.title')}</h1>

      <form
        onSubmit={submit}
        className="card mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
        aria-label={t('jobs.searchJobs')}
      >
        <div>
          <label htmlFor="f-skill" className="label">
            {t('jobs.skill')}
          </label>

          <select
            id="f-skill"
            className="input"
            value={draft.skill}
            onChange={set('skill')}
          >
            <option value="">{t('jobs.anySkill')}</option>
            {SKILLS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="f-loc" className="label">
            {t('jobs.location')}
          </label>

          <input
            id="f-loc"
            className="input"
            value={draft.location}
            onChange={set('location')}
            placeholder={t('jobs.locationPlaceholder')}
          />
        </div>

        <div>
          <label htmlFor="f-min" className="label">
            {t('jobs.minimumWage')}
          </label>

          <input
            id="f-min"
            type="number"
            min={0}
            className="input"
            value={draft.minWage}
            onChange={set('minWage')}
          />
        </div>

        <div>
          <label htmlFor="f-max" className="label">
            {t('jobs.maximumWage')}
          </label>

          <input
            id="f-max"
            type="number"
            min={0}
            className="input"
            value={draft.maxWage}
            onChange={set('maxWage')}
          />
        </div>

        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary flex-1">
            <Search size={18} aria-hidden />
            {t('jobs.search')}
          </button>

          <button type="button" onClick={reset} className="btn-outline">
            {t('jobs.clear')}
          </button>
        </div>

        {formError && (
          <p
            role="alert"
            className="text-sm font-medium text-red-700 sm:col-span-2 lg:col-span-5"
          >
            {formError}
          </p>
        )}
      </form>

      <div className="mt-6">
        {loading && (
          <LoadingSpinner label={t('jobs.loading')} />
        )}

        {error && (
          <ErrorMessage message={error} onRetry={reload} />
        )}

        {!loading && !error && data && data.length === 0 && (
          <EmptyState
            title={t('jobs.noJobs')}
            text={t('jobs.noJobsMessage')}
          />
        )}

        {!loading && !error && data && data.length > 0 && (
          <>
            <p className="mb-3 text-slate-600">
              {t('jobs.jobsFound', { count: data.length })}
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...data]
                .sort((a, b) => b.jobId - a.jobId)
                .map((j) => (
                  <JobCard key={j.jobId} job={j} />
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
