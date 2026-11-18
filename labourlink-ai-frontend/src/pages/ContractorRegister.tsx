
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, CheckCircle2, LogIn, UserPlus } from 'lucide-react';
import Field, { fieldProps } from '../components/Field';
import ErrorMessage from '../components/ErrorMessage';
import WorkProfileFields from '../components/WorkProfileFields';
import { registerContractor } from '../services/contractorService';
import { errorMessage } from '../services/api';
import { checkPhone, checkRequired, clean, type Errors } from '../utils/validation';

type K = 'contractorName' | 'companyName' | 'phone' | 'location' | 'password';

export default function ContractorRegister() {
  const { t } = useTranslation();

  const [f, setF] = useState({
    contractorName: '',
    companyName: '',
    phone: '',
    location: '',
    state: '',
    district: '',
    password: ''
  });

  const [errors, setErrors] = useState<Errors<K>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const on = (e: ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [e.target.name]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();

    const errs = clean<K>({
      contractorName: checkRequired(f.contractorName, t('contractorRegister.contractorName')),
      companyName: checkRequired(f.companyName, t('contractorRegister.companyName')),
      phone: checkPhone(f.phone),
      location: checkRequired(f.location, t('contractorRegister.location')),
      password: f.password.length < 6
        ? t('contractorRegister.passwordError')
        : undefined
    });

    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    setApiError(null);

    try {
      await registerContractor({
        ...f,
        contractorName: f.contractorName.trim(),
        companyName: f.companyName.trim(),
        phone: f.phone.trim(),
        state: f.state.trim(),
        district: f.district.trim(),
        location: f.location.trim()
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
        <div role="status" className="card border-2 border-emerald-300 bg-emerald-50/70 p-8 text-center space-y-4 shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
            <CheckCircle2 size={36} aria-hidden />
          </div>

          <h1 className="text-2xl font-extrabold text-emerald-900">
            {t('contractorRegister.successTitle')}
          </h1>

          <p className="text-base text-emerald-800 leading-relaxed">
            {t('contractorRegister.successMessage')}
          </p>

          <div className="pt-4 flex justify-center">
            <Link to="/login" className="btn-primary !bg-emerald-700 hover:!bg-emerald-800 flex items-center justify-center gap-2">
              <LogIn size={18} aria-hidden />
              <span>{t('contractorRegister.goToLogin')}</span>
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
          <Building2 size={14} aria-hidden />
          <span>{t('contractorRegister.badge')}</span>
        </span>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
          {t('contractorRegister.title')}
        </h1>
        <p className="mt-2 text-base text-slate-600">
          {t('contractorRegister.description')} {t('contractorRegister.postJobsAndFind')}
        </p>
      </div>

      <form onSubmit={submit} noValidate className="card mt-6 border-2 border-slate-200/90 bg-white p-6 md:p-8 space-y-5">
        {apiError && <ErrorMessage message={apiError} />}

        <Field
          id="contractorName"
          label={t('contractorRegister.contractorName')}
          error={errors.contractorName}
        >
          <input
            {...fieldProps('contractorName', errors.contractorName)}
            name="contractorName"
            placeholder={t('contractorRegister.namePlaceholder')}
            value={f.contractorName}
            onChange={on}
            autoComplete="name"
          />
        </Field>

        <Field
          id="companyName"
          label={t('contractorRegister.companyName')}
          error={errors.companyName}
        >
          <input
            {...fieldProps('companyName', errors.companyName)}
            name="companyName"
            placeholder={t('contractorRegister.companyPlaceholder')}
            value={f.companyName}
            onChange={on}
            autoComplete="organization"
          />
        </Field>

        <Field
          id="phone"
          label={t('contractorRegister.phone')}
          error={errors.phone}
          hint={t('contractorRegister.phoneHint')}
        >
          <input
            {...fieldProps('phone', errors.phone)}
            name="phone"
            value={f.phone}
            onChange={on}
            placeholder={t('contractorRegister.phonePlaceholder')}
            inputMode="numeric"
            maxLength={10}
            autoComplete="tel"
          />
        </Field>

        <Field
          id="location"
          label={t('contractorRegister.location')}
          error={errors.location}
        >
          <input
            {...fieldProps('location', errors.location)}
            name="location"
            value={f.location}
            onChange={on}
            placeholder={t('contractorRegister.locationPlaceholder')}
          />
        </Field>

        <WorkProfileFields {...f} onChange={on} />
        <Field
          id="password"
          label={t('contractorRegister.password')}
          error={errors.password}
          hint={t('contractorRegister.passwordHint')}
        >
          <input
            {...fieldProps('password', errors.password)}
            name="password"
            type="password"
            placeholder={t('contractorRegister.passwordHint')}
            value={f.password}
            onChange={on}
            autoComplete="new-password"
          />
        </Field>

        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full text-lg font-bold !py-3.5 flex items-center justify-center gap-2 shadow-md"
        >
          <UserPlus size={20} aria-hidden />
          <span>
            {busy
              ? t('contractorRegister.registering')
              : t('contractorRegister.register')}
          </span>
        </button>

        <p className="text-center text-sm text-slate-600">
          {t('contractorRegister.alreadyRegistered')}{' '}
          <Link to="/login" className="font-bold text-blue-700 hover:text-blue-900 underline">
            {t('workerRegister.loginHere')}
          </Link>
        </p>
      </form>
    </div>
  );
}
