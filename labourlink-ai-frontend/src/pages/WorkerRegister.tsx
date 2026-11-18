
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, HardHat, LogIn, MapPin, Search, User, UserCheck } from 'lucide-react';

import Field, { fieldProps } from '../components/Field';
import ErrorMessage from '../components/ErrorMessage';
import WorkProfileFields from '../components/WorkProfileFields';

import { registerWorker } from '../services/workerService';
import { errorMessage } from '../services/api';

import {
  checkNonNegative,
  checkPhone,
  checkRequired,
  clean,
  type Errors,
} from '../utils/validation';

export const SKILLS = [
  'Mason',
  'Electrician',
  'Plumber',
  'Carpenter',
  'Painter',
  'Welder',
  'Helper',
  'Other',
];

type K =
  | 'name'
  | 'phone'
  | 'password'
  | 'confirmPassword'
  | 'skill'
  | 'experience'
  | 'location';

export default function WorkerRegister() {
  const { t } = useTranslation();

  const [f, setF] = useState({
    name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    skill: '',
    experience: '',
    location: '',
    state: '',
    district: '',
    category: '',
    availability: true,
    expectedWagePerDay: '',
  });

  const [errors, setErrors] = useState<Errors<K>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const on = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setF((p) => ({ ...p, [name]: value }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();

    const errs = clean<K>({
      name: checkRequired(f.name, t('workerRegister.fullName')),
      phone: checkPhone(f.phone),
      password:
        f.password.length < 6
          ? t('workerRegister.passwordError')
          : undefined,
      confirmPassword:
        f.confirmPassword !== f.password
          ? t('workerRegister.passwordMismatch')
          : undefined,
      skill: checkRequired(f.skill, t('workerRegister.skill')),
      experience: checkNonNegative(
        f.experience,
        t('workerRegister.experience')
      ),
      location: checkRequired(
        f.location,
        t('workerRegister.location')
      ),
    });

    setErrors(errs);

    if (Object.keys(errs).length) return;

    setBusy(true);
    setApiError(null);

    try {
      await registerWorker({
        name: f.name.trim(),
        phone: f.phone.trim(),
        password: f.password,
        skill: f.skill,
        experience: Number(f.experience),
        location: f.location.trim(),
        state: f.state.trim(),
        district: f.district.trim(),
        category: f.category.trim(),
        availability: f.availability,
        expectedWagePerDay: f.expectedWagePerDay === '' ? null : Number(f.expectedWagePerDay),
      });

      setDone(true);
    } catch (err) {
      setApiError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <div
          role="status"
          className="card border-2 border-emerald-300 bg-emerald-50/70 p-8 text-center space-y-4 shadow-lg"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
            <CheckCircle2 size={36} aria-hidden />
          </div>

          <h1 className="text-2xl font-extrabold text-emerald-900">
            {t('workerRegister.registrationComplete')}
          </h1>

          <p className="text-base text-emerald-800 leading-relaxed">
            {t('workerRegister.successMessage')}
          </p>

          <div className="pt-4 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/worker/login" className="btn-primary !bg-emerald-700 hover:!bg-emerald-800 flex items-center justify-center gap-2">
              <LogIn size={18} aria-hidden />
              <span>{t('workerRegister.workerLogin')}</span>
            </Link>

            <Link to="/jobs" className="btn-outline flex items-center justify-center gap-2">
              <Search size={18} aria-hidden />
              <span>{t('workerRegister.findWork')}</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10 md:py-16">
      {/* Header */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-800">
          <HardHat size={14} aria-hidden />
          <span>{t('workerRegister.badge')}</span>
        </span>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
          {t('workerRegister.title')}
        </h1>
        <p className="mt-2 text-base text-slate-600">
          {t('workerRegister.description')} {t('workerRegister.takesOneMinute')}
        </p>
      </div>

      <form
        onSubmit={submit}
        noValidate
        className="card mt-6 border-2 border-slate-200/90 bg-white p-6 md:p-8 space-y-6"
      >
        {apiError && <ErrorMessage message={apiError} />}

        {/* Step 1: Personal & Contact */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-blue-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <User size={18} className="text-blue-600" aria-hidden />
            <span>{t('workerRegister.step1Heading')}</span>
          </h2>

          <Field
            id="name"
            label={t('workerRegister.fullName')}
            error={errors.name}
          >
            <input
              {...fieldProps('name', errors.name)}
              name="name"
              placeholder={t('workerRegister.namePlaceholder')}
              value={f.name}
              onChange={on}
              autoComplete="name"
            />
          </Field>

          <Field
            id="phone"
            label={t('workerRegister.phone')}
            error={errors.phone}
            hint={t('workerRegister.phoneHint')}
          >
            <input
              {...fieldProps('phone', errors.phone)}
              name="phone"
              value={f.phone}
              onChange={on}
              placeholder={t('workerRegister.phonePlaceholder')}
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel"
            />
          </Field>
        </div>

        {/* Step 2: Trade & Experience */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-blue-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <HardHat size={18} className="text-blue-600" aria-hidden />
            <span>{t('workerRegister.step2Heading')}</span>
          </h2>

          <Field
            id="skill"
            label={t('workerRegister.skill')}
            error={errors.skill}
          >
            <select
              {...fieldProps('skill', errors.skill)}
              name="skill"
              value={f.skill}
              onChange={on}
            >
              <option value="">
                {t('workerRegister.chooseSkill')}
              </option>

              {SKILLS.map((s) => (
                <option key={s} value={s}>
                  {t(`workerRegister.skills.${s}`, s)}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="experience"
              label={t('workerRegister.experience')}
              error={errors.experience}
            >
              <input
                {...fieldProps('experience', errors.experience)}
                name="experience"
                type="number"
                min={0}
                placeholder={t('workerRegister.experiencePlaceholder')}
                value={f.experience}
                onChange={on}
                inputMode="numeric"
              />
            </Field>

            <Field
              id="expectedWagePerDay"
              label={t('workerRegister.expectedWage')}
            >
              <input
                id="expectedWagePerDay"
                name="expectedWagePerDay"
                type="number"
                min={0}
                placeholder={t('workerRegister.expectedWagePlaceholder')}
                value={f.expectedWagePerDay}
                onChange={on}
                inputMode="decimal"
                className="input"
              />
            </Field>
          </div>
        </div>

        {/* Step 3: Location & Security */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-blue-900 border-b border-slate-100 pb-2 flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" aria-hidden />
            <span>{t('workerRegister.step3Heading')}</span>
          </h2>

          <WorkProfileFields {...f} onChange={on} />
          <Field
            id="location"
            label={t('workerRegister.location')}
            error={errors.location}
          >
            <input
              {...fieldProps('location', errors.location)}
              name="location"
              value={f.location}
              onChange={on}
              placeholder={t('workerRegister.locationPlaceholder')}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="password"
              label={t('workerRegister.password')}
              error={errors.password}
              hint={t('workerRegister.passwordHint')}
            >
              <input
                {...fieldProps('password', errors.password)}
                name="password"
                type="password"
                placeholder={t('workerRegister.passwordPlaceholder')}
                value={f.password}
                onChange={on}
                autoComplete="new-password"
              />
            </Field>

            <Field
              id="confirmPassword"
              label={t('workerRegister.confirmPassword')}
              error={errors.confirmPassword}
            >
              <input
                {...fieldProps('confirmPassword', errors.confirmPassword)}
                name="confirmPassword"
                type="password"
                placeholder={t('workerRegister.confirmPasswordPlaceholder')}
                value={f.confirmPassword}
                onChange={on}
                autoComplete="new-password"
              />
            </Field>
          </div>
        </div>

        {/* Step 4: Availability Toggle Card */}
        <label className="flex cursor-pointer items-center gap-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 p-4 transition-colors hover:bg-emerald-100/60">
          <input
            type="checkbox"
            className="h-6 w-6 accent-emerald-600 rounded cursor-pointer"
            checked={f.availability}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                availability: e.target.checked,
              }))
            }
          />
          <div className="flex flex-col">
            <span className="text-base font-bold text-emerald-950 flex items-center gap-1.5">
              <CheckCircle2 size={16} className="text-emerald-700" aria-hidden />
              {t('workerRegister.available')}
            </span>
            <span className="text-xs text-emerald-800">
              {t('workerRegister.availableHelp')}
            </span>
          </div>
        </label>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full text-lg font-bold !py-3.5 flex items-center justify-center gap-2 shadow-md"
        >
          <UserCheck size={20} aria-hidden />
          <span>
            {busy
              ? t('workerRegister.creating')
              : t('workerRegister.register')}
          </span>
        </button>

        {/* Existing account link */}
        <p className="text-center text-sm text-slate-600">
          {t('workerRegister.alreadyAccount')}{' '}
          <Link to="/worker/login" className="font-bold text-blue-700 hover:text-blue-900 underline">
            {t('workerRegister.loginHere')}
          </Link>
        </p>
      </form>
    </div>
  );
}
