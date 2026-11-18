import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { errorMessage } from '../services/api';
import ErrorMessage from './ErrorMessage';
import Field, { fieldProps } from './Field';
import WorkProfileFields from './WorkProfileFields';

interface Props {
  initial: { category?: string | null; state?: string | null; district?: string | null; expectedWagePerDay?: number | null };
  worker?: boolean;
  save: (data: { category: string; state: string; district: string; expectedWagePerDay: number | null }) => Promise<unknown>;
}

export default function WorkProfileEditor({ initial, worker = false, save }: Props) {
  const { t } = useTranslation();
  const wageId = useId();
  const [fields, setFields] = useState({
    category: initial.category ?? '',
    state: initial.state ?? '',
    district: initial.district ?? '',
    wage: initial.expectedWagePerDay?.toString() ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await save({
        category: fields.category.trim(),
        state: fields.state.trim(),
        district: fields.district.trim(),
        expectedWagePerDay: fields.wage === '' ? null : Number(fields.wage),
      });
      setSaved(true);
    } catch (failure) {
      setError(errorMessage(failure));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 border-t border-slate-100 pt-6">
      <h2 className="text-lg font-bold">{t(worker ? 'workProfile.workerTitle' : 'workProfile.contractorTitle')}</h2>
      <p className="text-sm text-slate-600">{t('workProfile.optionalHint')}</p>
      <WorkProfileFields
        state={fields.state}
        district={fields.district}
        category={worker ? fields.category : undefined}
        onChange={({ target }) => {
          setSaved(false);
          setFields((previous) => ({ ...previous, [target.name]: target.value }));
        }}
      />
      {worker && (
        <Field id={wageId} label={t('workProfile.expectedWage')}>
          <input {...fieldProps(wageId)} type="number" min="0" step="any" value={fields.wage}
            onChange={({ target }) => {
              setSaved(false);
              setFields((previous) => ({ ...previous, wage: target.value }));
            }} />
        </Field>
      )}
      <button type="submit" className="btn-primary" disabled={saving}>
        {t(saving ? 'workProfile.saving' : 'workProfile.save')}
      </button>
      {saved && <p role="status" className="text-sm text-emerald-800">{t('workProfile.saved')}</p>}
      {error && <ErrorMessage message={error} />}
    </form>
  );
}
