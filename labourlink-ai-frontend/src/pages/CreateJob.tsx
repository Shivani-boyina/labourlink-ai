import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  IndianRupee,
  Plus,
} from 'lucide-react';
import Field, { fieldProps } from '../components/Field';
import WorkProfileFields from '../components/WorkProfileFields';
import ErrorMessage from '../components/ErrorMessage';
import { createJob, getJob, updateJob } from '../services/jobService';
import { errorMessage } from '../services/api';
import { checkPositive, checkRequired, clean, type Errors } from '../utils/validation';
import { SKILLS } from './WorkerRegister';
import { useAuth } from '../context/AuthContext';

type K = 'title' | 'requiredSkill' | 'location' | 'wagePerDay' | 'requiredWorkers' | 'minimumExperience' | 'durationDays' | 'endDate';

export default function CreateJob() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { id } = useParams();
  const { session } = useAuth();
  const editing = Boolean(id);
  const [f, setF] = useState({
    title: '',
    description: '',
    requiredSkill: '',
    location: '',
    state: '',
    district: '',
    category: '',
    wagePerDay: '',
    requiredWorkers: '',
    minimumExperience: '',
    durationDays: '',
    startDate: '',
    endDate: '',
  });

  const [errors, setErrors] = useState<Errors<K>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(editing);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getJob(id)
      .then((job) => {
        if (!active) return;
        if (session?.role !== 'contractor' || session.userId !== job.contractorId) {
          throw new Error(t('jobCreate.ownershipError'));
        }
        setF({
          title: job.title,
          description: job.description ?? '',
          requiredSkill: job.requiredSkill,
          location: job.location,
          state: job.state ?? '',
          district: job.district ?? '',
          category: job.category ?? '',
          wagePerDay: String(job.wagePerDay),
          requiredWorkers: String(job.requiredWorkers),
          minimumExperience: job.minimumExperience == null ? '' : String(job.minimumExperience),
          durationDays: job.durationDays == null ? '' : String(job.durationDays),
          startDate: job.startDate ?? '',
          endDate: job.endDate ?? '',
        });
      })
      .catch((error) => {
        if (active) setApiError(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoadingExisting(false);
      });
    return () => { active = false; };
  }, [id, session?.role, session?.userId, t]);

  const on = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [e.target.name]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = clean<K>({
      title: checkRequired(f.title, t('jobCreate.title')),
      requiredSkill: checkRequired(f.requiredSkill, t('jobCreate.skill')),
      location: checkRequired(f.location, t('jobCreate.location')),
      wagePerDay: checkPositive(f.wagePerDay, t('jobCreate.wage')),
      requiredWorkers: checkPositive(f.requiredWorkers, t('jobCreate.workers')),
      endDate: Boolean(f.startDate) !== Boolean(f.endDate) || f.endDate < f.startDate
        ? t('allocation.invalidSchedule') : undefined,
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setApiError(null);
    try {
      const payload = {
        title: f.title.trim(),
        description: f.description.trim(),
        requiredSkill: f.requiredSkill,
        location: f.location.trim(),
        state: f.state.trim(),
        district: f.district.trim(),
        category: f.category.trim(),
        wagePerDay: Number(f.wagePerDay),
        requiredWorkers: Number(f.requiredWorkers),
        status: 'OPEN',
        minimumExperience: f.minimumExperience === '' ? null : Number(f.minimumExperience),
        durationDays: f.durationDays === '' ? null : Number(f.durationDays),
        startDate: f.startDate || null,
        endDate: f.endDate || null,
      };
      if (id) await updateJob(Number(id), payload);
      else await createJob(payload);
      setOk(true);
      window.setTimeout(() => nav('/contractor/dashboard'), 1200);
    } catch (err) {
      setApiError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <Link
        to="/contractor/dashboard"
        className="mb-5 inline-flex items-center gap-2 text-base font-semibold text-blue-700 hover:text-blue-900"
      >
        <ArrowLeft size={18} aria-hidden />
        <span>{t('jobCreate.backToDashboard')}</span>
      </Link>

      <div className="mt-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
          <Briefcase size={14} aria-hidden />
          <span>{t(editing ? 'jobCreate.badgeUpdate' : 'jobCreate.badgeNew')}</span>
        </span>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
          {t(editing ? 'jobCreate.editHeading' : 'jobCreate.heading')}
        </h1>
        <p className="mt-2 text-base text-slate-600">
          {t('jobCreate.pageDesc')}
        </p>
      </div>

      <form onSubmit={submit} noValidate className="card mt-6 border-2 border-slate-200/90 bg-white p-6 md:p-8 space-y-6">
        {loadingExisting && <p role="status" className="text-slate-600">{t('jobCreate.loading')}</p>}
        {apiError && <ErrorMessage message={apiError} />}

        {ok && (
          <div role="status" className="flex items-center gap-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 text-emerald-900">
            <CheckCircle2 size={22} className="text-emerald-700 shrink-0" aria-hidden />
            <div>
              <p className="font-bold">{t(editing ? 'jobCreate.updateSuccess' : 'jobCreate.success')}</p>
              <p className="text-xs text-emerald-800">{t('jobCreate.redirecting')}</p>
            </div>
          </div>
        )}

        {/* Section 1: Title and Trade */}
        <div className="space-y-4">
          <Field id="title" label={t('jobCreate.title')} error={errors.title}>
            <input
              {...fieldProps('title', errors.title)}
              name="title"
              placeholder={t('jobCreate.titlePlaceholder')}
              value={f.title}
              onChange={on}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="requiredSkill" label={t('jobCreate.skill')} error={errors.requiredSkill}>
              <select {...fieldProps('requiredSkill', errors.requiredSkill)} name="requiredSkill" value={f.requiredSkill} onChange={on}>
                <option value="">{t('jobCreate.chooseSkill')}</option>
                {SKILLS.map((s) => <option key={s} value={s}>{t('workerRegister.skills.' + s, s)}</option>)}
              </select>
            </Field>

            <Field id="location" label={t('jobCreate.location')} error={errors.location}>
              <input
                {...fieldProps('location', errors.location)}
                name="location"
                value={f.location}
                onChange={on}
                placeholder={t('jobCreate.locationPlaceholder')}
              />
            </Field>
          </div>
        </div>

        {/* Section 2: Wage and Workforce Requirements */}
        <div className="space-y-4 border-t border-slate-100 pt-5">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <IndianRupee size={18} className="text-blue-600" aria-hidden />
            <span>{t('jobCreate.payAndWorkforceHeading')}</span>
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <WorkProfileFields {...f} onChange={on} />
            </div>
            <Field id="wagePerDay" label={t('jobCreate.perDayWage')} error={errors.wagePerDay}>
              <input
                {...fieldProps('wagePerDay', errors.wagePerDay)}
                name="wagePerDay"
                type="number"
                min={1}
                placeholder="e.g. 800"
                value={f.wagePerDay}
                onChange={on}
              />
            </Field>

            <Field id="requiredWorkers" label={t('jobCreate.workers')} error={errors.requiredWorkers}>
              <input
                {...fieldProps('requiredWorkers', errors.requiredWorkers)}
                name="requiredWorkers"
                type="number"
                min={1}
                placeholder="e.g. 5"
                value={f.requiredWorkers}
                onChange={on}
              />
            </Field>

            <Field id="durationDays" label={`${t('jobCreate.durationDays')} ${t('jobCreate.optional')}`} error={errors.durationDays}>
              <input
                {...fieldProps('durationDays', errors.durationDays)}
                name="durationDays"
                type="number"
                min={1}
                placeholder="e.g. 15"
                value={f.durationDays}
                onChange={on}
              />
            </Field>

            <Field id="minimumExperience" label={`${t('jobCreate.minimumExperience')} ${t('jobCreate.optional')}`} error={errors.minimumExperience}>
              <input
                {...fieldProps('minimumExperience', errors.minimumExperience)}
                name="minimumExperience"
                type="number"
                min={0}
                placeholder="e.g. 2"
                value={f.minimumExperience}
                onChange={on}
              />
            </Field>
          </div>
        </div>

        {/* Section 3: Description */}
        <div className="border-t border-slate-100 pt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="job-start-date" label={t('allocation.start')}>
              <input {...fieldProps('job-start-date')} name="startDate" type="date" value={f.startDate} onChange={on} />
            </Field>
            <Field id="job-end-date" label={t('allocation.end')} error={errors.endDate}>
              <input {...fieldProps('job-end-date', errors.endDate)} name="endDate" type="date" min={f.startDate || undefined} value={f.endDate} onChange={on} />
            </Field>
          </div>
          <Field id="description" label={t('jobCreate.description')}>
            <textarea
              id="description"
              name="description"
              rows={3}
              className="input !h-auto"
              placeholder={t('jobCreate.descPlaceholder')}
              value={f.description}
              onChange={on}
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={busy || ok || loadingExisting}
          className="btn-primary w-full text-lg font-bold !py-3.5 flex items-center justify-center gap-2 shadow-md"
        >
          {editing ? <CheckCircle2 size={20} aria-hidden /> : <Plus size={20} aria-hidden />}
          <span>
            {busy ? t(editing ? 'jobCreate.updating' : 'jobCreate.creating') : t(editing ? 'jobCreate.editHeading' : 'jobCreate.heading')}
          </span>
        </button>
      </form>
    </div>
  );
}
