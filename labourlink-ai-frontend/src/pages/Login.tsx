import { useState, type FormEvent } from 'react';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Building2, HardHat } from 'lucide-react';

import Field, { fieldProps } from '../components/Field';
import ErrorMessage from '../components/ErrorMessage';

import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';

import {
  checkPhone,
  clean,
  type Errors,
} from '../utils/validation';

type K = 'phone' | 'password';

export default function Login() {
  const location = useLocation();
  const nav = useNavigate();

  const isWorkerLoginPage =
    location.pathname === '/worker/login';

  const [role, setRole] =
    useState<'worker' | 'contractor'>(
      isWorkerLoginPage
        ? 'worker'
        : 'contractor'
    );

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [errors, setErrors] =
    useState<Errors<K>>({});

  const [busy, setBusy] = useState(false);

  const [apiError, setApiError] =
    useState<string | null>(null);

  const {
    login,
    workerLogin,
    isLoggedIn,
  } = useAuth();

  const from =
    (location.state as { from?: string } | null)
      ?.from ??
    (role === 'worker'
      ? '/worker/dashboard'
      : '/contractor/dashboard');

  if (isLoggedIn) {
    return (
      <Navigate
        to={
          role === 'worker'
            ? '/worker/dashboard'
            : '/contractor/dashboard'
        }
        replace
      />
    );
  }

  function changeRole(
    newRole: 'worker' | 'contractor'
  ) {
    setRole(newRole);
    setPhone('');
    setPassword('');
    setErrors({});
    setApiError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();

    const errs = clean<K>({
      phone: checkPhone(phone),
      password: password
        ? undefined
        : 'Password is required',
    });

    setErrors(errs);

    if (Object.keys(errs).length) {
      return;
    }

    setBusy(true);
    setApiError(null);

    try {
      if (role === 'worker') {
        await workerLogin({
          phone: phone.trim(),
          password,
        });

        nav('/worker/dashboard', {
          replace: true,
        });
      } else {
        await login({
          phone: phone.trim(),
          password,
        });

        nav(from, {
          replace: true,
        });
      }
    } catch (err) {
      setApiError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const tab = (
    r: 'worker' | 'contractor'
  ) =>
    `flex flex-1 items-center justify-center gap-2 rounded-xl border-2 px-4 py-3 font-semibold ${
      role === r
        ? 'border-navy-800 bg-navy-800 text-white'
        : 'border-slate-300 bg-white text-slate-700'
    }`;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="text-3xl font-bold">
        Login
      </h1>

      <div
        className="mt-5 flex gap-3"
        role="group"
        aria-label="Login as"
      >
        <button
          type="button"
          className={tab('worker')}
          aria-pressed={role === 'worker'}
          onClick={() => changeRole('worker')}
        >
          <HardHat
            size={20}
            aria-hidden
          />
          Worker
        </button>

        <button
          type="button"
          className={tab('contractor')}
          aria-pressed={role === 'contractor'}
          onClick={() => changeRole('contractor')}
        >
          <Building2
            size={20}
            aria-hidden
          />
          Contractor
        </button>
      </div>

      <form
        onSubmit={submit}
        noValidate
        className="card mt-5 space-y-5"
      >
        {apiError && (
          <ErrorMessage message={apiError} />
        )}

        <Field
          id="phone"
          label="Phone"
          error={errors.phone}
          hint="Use the phone number registered with LabourLink AI"
        >
          <input
            {...fieldProps(
              'phone',
              errors.phone
            )}
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value)
            }
            inputMode="numeric"
            maxLength={10}
            autoComplete="username"
          />
        </Field>

        <Field
          id="password"
          label="Password"
          error={errors.password}
        >
          <input
            {...fieldProps(
              'password',
              errors.password
            )}
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            autoComplete="current-password"
          />
        </Field>

        <button
          type="submit"
          disabled={busy}
          className="btn-accent w-full"
        >
          {busy
            ? 'Logging in...'
            : `Login as ${
                role === 'worker'
                  ? 'Worker'
                  : 'Contractor'
              }`}
        </button>

        {role === 'worker' ? (
          <p className="text-center text-sm">
            New worker?{' '}
            <Link
              className="font-semibold text-navy-700 underline"
              to="/worker/register"
            >
              Register here
            </Link>
          </p>
        ) : (
          <p className="text-center text-sm">
            New contractor?{' '}
            <Link
              className="font-semibold text-navy-700 underline"
              to="/contractor/register"
            >
              Register here
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}