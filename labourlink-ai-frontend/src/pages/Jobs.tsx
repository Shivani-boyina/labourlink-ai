
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Briefcase, Filter, IndianRupee, MapPin, RotateCcw, Search } from 'lucide-react';
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
    maxWage: '',
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
      maxWage: '',
    };

    setDraft(empty);
    setApplied({});
    setFormError(null);
  };

  const selectSkillQuick = (skillName: string) => {
    const nextSkill = draft.skill === skillName ? '' : skillName;
    const nextDraft = { ...draft, skill: nextSkill };
    setDraft(nextDraft);
    setApplied({ ...nextDraft });
    setFormError(null);
  };

  const set = (k: keyof JobFilters) =>
    (e: { target: { value: string } }) =>
      setDraft((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      {/* Header */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
          <Briefcase size={14} aria-hidden />
          <span>{t('jobs.badge')}</span>
        </span>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">
          {t('jobs.title')}
        </h1>
        <p className="mt-2 text-base text-slate-600 max-w-2xl">
          {t('jobs.subtitle')}
        </p>
      </div>

      {/* Quick Trade Filter Pills for Fast Mobile Access */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
          <Filter size={13} aria-hidden /> {t('jobs.quickFilter')}
        </span>
        <button
          type="button"
          onClick={() => selectSkillQuick('')}
          className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors ${
            !draft.skill
              ? 'bg-blue-700 text-white shadow-sm'
              : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
          }`}
        >
          {t('jobs.allTrades')}
        </button>
        {SKILLS.map((skill) => (
          <button
            key={skill}
            type="button"
            onClick={() => selectSkillQuick(skill)}
            className={`rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors ${
              draft.skill === skill
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            {t(`workerRegister.skills.${skill}`, skill)}
          </button>
        ))}
      </div>

      {/* Filter Form Card */}
      <form
        onSubmit={submit}
        className="card mt-4 border-2 border-slate-200/90 bg-white p-5 md:p-6"
        aria-label={t('jobs.searchJobs')}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="f-skill" className="label flex items-center gap-1.5">
              <span>{t('jobs.skill')} ({t('jobs.tradeLabel')})</span>
            </label>
            <select
              id="f-skill"
              className="input"
              value={draft.skill}
              onChange={set('skill')}
            >
              <option value="">{t('jobs.anySkill')}</option>
              {SKILLS.map((s) => (
                <option key={s} value={s}>{t(`workerRegister.skills.${s}`, s)}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="f-loc" className="label flex items-center gap-1.5">
              <MapPin size={16} className="text-blue-600" aria-hidden />
              <span>{t('jobs.location')}</span>
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
            <label htmlFor="f-min" className="label flex items-center gap-1.5">
              <IndianRupee size={16} className="text-blue-600" aria-hidden />
              <span>{t('jobs.minimumWage')}</span>
            </label>
            <input
              id="f-min"
              type="number"
              min={0}
              className="input"
              value={draft.minWage}
              onChange={set('minWage')}
              placeholder="e.g. 500"
            />
          </div>

          <div>
            <label htmlFor="f-max" className="label flex items-center gap-1.5">
              <IndianRupee size={16} className="text-blue-600" aria-hidden />
              <span>{t('jobs.maximumWage')}</span>
            </label>
            <input
              id="f-max"
              type="number"
              min={0}
              className="input"
              value={draft.maxWage}
              onChange={set('maxWage')}
              placeholder="e.g. 1500"
            />
          </div>
        </div>

        {formError && (
          <p
            role="alert"
            className="mt-3 text-sm font-semibold text-red-600"
          >
            {formError}
          </p>
        )}

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={reset}
            className="btn-outline !py-3 flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} aria-hidden />
            <span>{t('jobs.clear')}</span>
          </button>

          <button
            type="submit"
            className="btn-primary !py-3 flex items-center justify-center gap-2 sm:min-w-[160px]"
          >
            <Search size={18} aria-hidden />
            <span>{t('jobs.search')}</span>
          </button>
        </div>
      </form>

      {/* Results Section */}
      <div className="mt-8">
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
            action={
              <button type="button" onClick={reset} className="btn-primary">
                <RotateCcw size={16} aria-hidden />
                <span>{t('jobs.showAllJobs')}</span>
              </button>
            }
          />
        )}

        {!loading && !error && data && data.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-semibold text-slate-700">
                {t('jobs.jobsFound', { count: data.length })}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
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
