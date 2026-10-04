import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Field, { fieldProps } from '../components/Field';
import ErrorMessage from '../components/ErrorMessage';
import { registerContractor } from '../services/contractorService';
import { errorMessage } from '../services/api';
import { checkPhone, checkRequired, clean, type Errors } from '../utils/validation';

type K = 'contractorName' | 'companyName' | 'phone' | 'location' | 'password';

export default function ContractorRegister() {
  const [f, setF] = useState({ contractorName: '', companyName: '', phone: '', location: '', password: '' });
  const [errors, setErrors] = useState<Errors<K>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const on = (e: ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [e.target.name]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = clean<K>({
      contractorName: checkRequired(f.contractorName, 'Contractor name'),
      companyName: checkRequired(f.companyName, 'Company name'),
      phone: checkPhone(f.phone),
      location: checkRequired(f.location, 'Location'),
      password: f.password.length < 6 ? 'Password must be at least 6 characters' : undefined,
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setApiError(null);
    try {
      await registerContractor({ ...f, contractorName: f.contractorName.trim(), companyName: f.companyName.trim(), phone: f.phone.trim(), location: f.location.trim() });
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
        <div role="status" className="card border-green-300 bg-green-50 text-center">
          <h1 className="text-2xl font-bold text-green-800">Contractor registered</h1>
          <p className="mt-2">Your account has been created. Please log in to post jobs.</p>
          <Link to="/login" className="btn-primary mt-5">Go to Login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-3xl font-bold">Register as Contractor</h1>
      <p className="mt-1 text-slate-600">Create an account to post jobs and find workers.</p>
      <form onSubmit={submit} noValidate className="card mt-6 space-y-5">
        {apiError && <ErrorMessage message={apiError} />}
        <Field id="contractorName" label="Contractor Name" error={errors.contractorName}><input {...fieldProps('contractorName', errors.contractorName)} name="contractorName" value={f.contractorName} onChange={on} autoComplete="name" /></Field>
        <Field id="companyName" label="Company Name" error={errors.companyName}><input {...fieldProps('companyName', errors.companyName)} name="companyName" value={f.companyName} onChange={on} autoComplete="organization" /></Field>
        <Field id="phone" label="Phone" error={errors.phone} hint="This is your login ID"><input {...fieldProps('phone', errors.phone)} name="phone" value={f.phone} onChange={on} inputMode="numeric" maxLength={10} autoComplete="tel" /></Field>
        <Field id="location" label="Location" error={errors.location}><input {...fieldProps('location', errors.location)} name="location" value={f.location} onChange={on} placeholder="Example: Benz Circle" /></Field>
        <Field id="password" label="Password" error={errors.password}><input {...fieldProps('password', errors.password)} name="password" type="password" value={f.password} onChange={on} autoComplete="new-password" /></Field>
        <button type="submit" disabled={busy} className="btn-accent w-full">{busy ? 'Registering contractor...' : 'Register as Contractor'}</button>
      </form>
    </div>
  );
}
