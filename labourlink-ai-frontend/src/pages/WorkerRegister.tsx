
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import Field, { fieldProps } from '../components/Field';
import ErrorMessage from '../components/ErrorMessage';

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
    availability: true,
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
        availability: f.availability,
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
      <div className="mx-auto max-w-xl px-4 py-12">
        <div
          role="status"
          className="card border-green-300 bg-green-50 text-center"
        >
          <h1 className="text-2xl font-bold text-green-800">
            {t('workerRegister.registrationComplete')}
          </h1>

          <p className="mt-2">
            {t('workerRegister.successMessage')}
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link to="/worker/login" className="btn-primary">
              {t('workerRegister.workerLogin')}
            </Link>

            <Link to="/jobs" className="btn-outline">
              {t('workerRegister.findWork')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-bold">
        {t('workerRegister.title')}
      </h1>

      <p className="mt-1 text-slate-600">
        {t('workerRegister.description')}
      </p>

      <form
        onSubmit={submit}
        noValidate
        className="card mt-6 space-y-5"
      >
        {apiError && <ErrorMessage message={apiError} />}

        <Field
          id="name"
          label={t('workerRegister.fullName')}
          error={errors.name}
        >
          <input
            {...fieldProps('name', errors.name)}
            name="name"
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
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel"
          />
        </Field>

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
            value={f.confirmPassword}
            onChange={on}
            autoComplete="new-password"
          />
        </Field>

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
                {t(`workerRegister.skills.${s}`)}
              </option>
            ))}
          </select>
        </Field>

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
            value={f.experience}
            onChange={on}
            inputMode="numeric"
          />
        </Field>

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

        <label className="flex cursor-pointer items-center gap-3 text-lg font-semibold">
          <input
            type="checkbox"
            className="h-6 w-6 accent-navy-800"
            checked={f.availability}
            onChange={(e) =>
              setF((p) => ({
                ...p,
                availability: e.target.checked,
              }))
            }
          />

          {t('workerRegister.available')}
        </label>

        <button
          type="submit"
          disabled={busy}
          className="btn-accent w-full"
        >
          {busy
            ? t('workerRegister.creating')
            : t('workerRegister.register')}
        </button>
      </form>
    </div>
  );
}
