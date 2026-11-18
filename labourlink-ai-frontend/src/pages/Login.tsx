import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Building2, HardHat, LogIn, UserPlus } from 'lucide-react';

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
  const { t } = useTranslation();
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
    session,
  } = useAuth();

  if (session) {
    return (
      <Navigate
        to={session.role === 'worker' ? '/worker/dashboard' : '/contractor/dashboard'}
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
        : t('loginPage.passwordRequired'),
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

        nav('/contractor/dashboard', {
          replace: true,
        });
      }
    } catch (err) {
      setApiError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 md:py-16">
      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-slate-900">
          {t('loginPage.title')}
        </h1>
        <p className="mt-2 text-base text-slate-600">
          {t('loginPage.welcomeText')}
        </p>
      </div>

      {/* Role Selection Tabs */}
      <div
        className="mt-6 grid grid-cols-2 gap-3"
        role="group"
        aria-label={t('loginPage.roleGroup')}
      >
        <button
          type="button"
          className={`flex items-center justify-center gap-2.5 rounded-2xl border-2 p-4 font-bold text-base transition-all ${
            role === 'worker'
              ? 'border-blue-700 bg-blue-700 text-white shadow-md'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
          aria-pressed={role === 'worker'}
          onClick={() => changeRole('worker')}
        >
          <HardHat size={22} className={role === 'worker' ? 'text-white' : 'text-blue-600'} aria-hidden />
          <span>{t('loginPage.worker')}</span>
        </button>

        <button
          type="button"
          className={`flex items-center justify-center gap-2.5 rounded-2xl border-2 p-4 font-bold text-base transition-all ${
            role === 'contractor'
              ? 'border-blue-700 bg-blue-700 text-white shadow-md'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
          }`}
          aria-pressed={role === 'contractor'}
          onClick={() => changeRole('contractor')}
        >
          <Building2 size={22} className={role === 'contractor' ? 'text-white' : 'text-blue-600'} aria-hidden />
          <span>{t('loginPage.contractor')}</span>
        </button>
      </div>

      {/* Login Card Form */}
      <form
        onSubmit={submit}
        noValidate
        className="card mt-6 border-2 border-slate-200/90 bg-white p-6 md:p-8 space-y-5"
      >
        {apiError && (
          <ErrorMessage message={apiError} />
        )}

        <Field
          id="phone"
          label={t('loginPage.phone')}
          error={errors.phone}
          hint={t('loginPage.phoneHint')}
        >
          <div className="relative">
            <input
              {...fieldProps(
                'phone',
                errors.phone
              )}
              value={phone}
              onChange={(e) =>
                setPhone(e.target.value)
              }
              placeholder="e.g. 9876543210"
              inputMode="numeric"
              maxLength={10}
              autoComplete="username"
            />
          </div>
        </Field>

        <Field
          id="password"
          label={t('loginPage.password')}
          error={errors.password}
        >
          <input
            {...fieldProps(
              'password',
              errors.password
            )}
            type="password"
            placeholder={t('loginPage.enterPasswordPlaceholder')}
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
          className="btn-primary w-full text-lg font-bold !py-3.5 flex items-center justify-center gap-2 shadow-sm"
        >
          <LogIn size={20} aria-hidden />
          <span>
            {busy
              ? t('loginPage.loggingIn')
              : t('loginPage.loginAs', { role: t(role === 'worker' ? 'loginPage.worker' : 'loginPage.contractor') })}
          </span>
        </button>

        {/* Clear Registration Footer Links */}
        <div className="border-t border-slate-200 pt-4 text-center">
          {role === 'worker' ? (
            <p className="text-base text-slate-700">
              {t('loginPage.newWorker')}{' '}
              <Link
                className="font-bold text-blue-700 hover:text-blue-900 underline inline-flex items-center gap-1"
                to="/worker/register"
              >
                <UserPlus size={16} aria-hidden />
                <span>{t('loginPage.registerHere')} {t('loginPage.oneMinute')}</span>
              </Link>
            </p>
          ) : (
            <p className="text-base text-slate-700">
              {t('loginPage.newContractor')}{' '}
              <Link
                className="font-bold text-blue-700 hover:text-blue-900 underline inline-flex items-center gap-1"
                to="/contractor/register"
              >
                <Building2 size={16} aria-hidden />
                <span>{t('loginPage.registerHere')}</span>
              </Link>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
