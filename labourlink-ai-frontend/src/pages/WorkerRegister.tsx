import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

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

    setF((p) => ({
      ...p,
      [name]: value,
    }));
  };

  async function submit(e: FormEvent) {
    e.preventDefault();

    const errs = clean<K>({
      name: checkRequired(f.name, 'Full name'),

      phone: checkPhone(f.phone),

      password:
        f.password.length < 6
          ? 'Password must be at least 6 characters'
          : undefined,

      confirmPassword:
        f.confirmPassword !== f.password
          ? 'Passwords do not match'
          : undefined,

      skill: checkRequired(f.skill, 'Skill'),

      experience: checkNonNegative(
        f.experience,
        'Experience'
      ),

      location: checkRequired(
        f.location,
        'Location'
      ),
    });

    setErrors(errs);

    if (Object.keys(errs).length) {
      return;
    }

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
            Registration complete
          </h1>

          <p className="mt-2">
            Your worker account has been created successfully.
            You can now log in and look for work.
          </p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/worker/login"
              className="btn-primary"
            >
              Worker Login
            </Link>

            <Link
              to="/jobs"
              className="btn-outline"
            >
              Find Work
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-bold">
        Register as Worker
      </h1>

      <p className="mt-1 text-slate-600">
        Create your account so contractors can find you.
      </p>

      <form
        onSubmit={submit}
        noValidate
        className="card mt-6 space-y-5"
      >
        {apiError && (
          <ErrorMessage message={apiError} />
        )}

        <Field
          id="name"
          label="Full Name"
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
          label="Phone Number"
          error={errors.phone}
          hint="This will be your login username"
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
          label="Password"
          error={errors.password}
          hint="At least 6 characters"
        >
          <input
            {...fieldProps(
              'password',
              errors.password
            )}
            name="password"
            type="password"
            value={f.password}
            onChange={on}
            autoComplete="new-password"
          />
        </Field>

        <Field
          id="confirmPassword"
          label="Confirm Password"
          error={errors.confirmPassword}
        >
          <input
            {...fieldProps(
              'confirmPassword',
              errors.confirmPassword
            )}
            name="confirmPassword"
            type="password"
            value={f.confirmPassword}
            onChange={on}
            autoComplete="new-password"
          />
        </Field>

        <Field
          id="skill"
          label="Skill"
          error={errors.skill}
        >
          <select
            {...fieldProps(
              'skill',
              errors.skill
            )}
            name="skill"
            value={f.skill}
            onChange={on}
          >
            <option value="">
              Choose your skill
            </option>

            {SKILLS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field
          id="experience"
          label="Experience (years)"
          error={errors.experience}
        >
          <input
            {...fieldProps(
              'experience',
              errors.experience
            )}
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
          label="Location"
          error={errors.location}
        >
          <input
            {...fieldProps(
              'location',
              errors.location
            )}
            name="location"
            value={f.location}
            onChange={on}
            placeholder="Example: Benz Circle"
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

          I am available for work
        </label>

        <button
          type="submit"
          disabled={busy}
          className="btn-accent w-full"
        >
          {busy
            ? 'Creating account...'
            : 'Register as Worker'}
        </button>
      </form>
    </div>
  );
}