import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import Field, { fieldProps } from '../components/Field';
import ErrorMessage from '../components/ErrorMessage';
import { useAuth } from '../context/AuthContext';
import { createJob } from '../services/jobService';
import { errorMessage } from '../services/api';
import { checkPositive, checkRequired, clean, type Errors } from '../utils/validation';
import { SKILLS } from './WorkerRegister';

type K = 'title' | 'requiredSkill' | 'location' | 'wagePerDay' | 'requiredWorkers' | 'contractorId';

export default function CreateJob() {
  const { session } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({
    title: '', description: '', requiredSkill: '', location: '', wagePerDay: '', requiredWorkers: '',
    status: 'OPEN', contractorId: session?.contractorId != null ? String(session.contractorId) : '',
  });
  const [errors, setErrors] = useState<Errors<K>>({});
  const [busy, setBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const on = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [e.target.name]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const errs = clean<K>({
      title: checkRequired(f.title, 'Job title'),
      requiredSkill: checkRequired(f.requiredSkill, 'Skill'),
      location: checkRequired(f.location, 'Location'),
      wagePerDay: checkPositive(f.wagePerDay, 'Daily wage'),
      requiredWorkers: checkPositive(f.requiredWorkers, 'Workers needed'),
      contractorId: checkPositive(f.contractorId, 'Contractor ID'),
    });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setApiError(null);
    try {
      await createJob({
        title: f.title.trim(), description: f.description.trim(), requiredSkill: f.requiredSkill, location: f.location.trim(),
        wagePerDay: Number(f.wagePerDay), requiredWorkers: Number(f.requiredWorkers), status: f.status, contractorId: Number(f.contractorId),
      });
      setOk(true);
      window.setTimeout(() => nav('/contractor/dashboard'), 1200);
    } catch (err) {
      setApiError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Create Job</h1>
      <form onSubmit={submit} noValidate className="card mt-6 space-y-5">
        {apiError && <ErrorMessage message={apiError} />}
        {ok && <p role="status" className="rounded-xl bg-green-50 p-3 font-semibold text-green-800">Job created. Going to your dashboard...</p>}
        <Field id="title" label="Job Title" error={errors.title}><input {...fieldProps('title', errors.title)} name="title" value={f.title} onChange={on} /></Field>
        <Field id="description" label="Description"><textarea id="description" name="description" rows={3} className="input" value={f.description} onChange={on} /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="requiredSkill" label="Required Skill" error={errors.requiredSkill}>
            <select {...fieldProps('requiredSkill', errors.requiredSkill)} name="requiredSkill" value={f.requiredSkill} onChange={on}><option value="">Choose skill</option>{SKILLS.map((s) => <option key={s}>{s}</option>)}</select>
          </Field>
          <Field id="location" label="Location" error={errors.location}><input {...fieldProps('location', errors.location)} name="location" value={f.location} onChange={on} placeholder="Benz Circle" /></Field>
          <Field id="wagePerDay" label="Daily Wage (₹)" error={errors.wagePerDay}><input {...fieldProps('wagePerDay', errors.wagePerDay)} name="wagePerDay" type="number" min={1} value={f.wagePerDay} onChange={on} /></Field>
          <Field id="requiredWorkers" label="Workers Needed" error={errors.requiredWorkers}><input {...fieldProps('requiredWorkers', errors.requiredWorkers)} name="requiredWorkers" type="number" min={1} value={f.requiredWorkers} onChange={on} /></Field>
          <Field id="status" label="Status"><select id="status" name="status" className="input" value={f.status} onChange={on}><option value="OPEN">OPEN</option><option value="CLOSED">CLOSED</option></select></Field>
          <Field id="contractorId" label="Contractor ID" error={errors.contractorId} hint={session?.contractorId != null ? 'Filled from your login' : 'Enter your contractor ID'}>
            <input {...fieldProps('contractorId', errors.contractorId)} name="contractorId" type="number" min={1} value={f.contractorId} onChange={on} />
          </Field>
        </div>
        <button type="submit" disabled={busy || ok} className="btn-accent w-full">{busy ? 'Creating job...' : 'Create Job'}</button>
      </form>
    </div>
  );
}
