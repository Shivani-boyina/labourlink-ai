import { useId, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { correctAttendance, getCorrections, type CorrectionSource } from '../services/attendanceCorrectionService';
import type { AttendanceStatus } from '../services/allocationService';
import { errorMessage } from '../services/api';
import { useFetch } from '../utils/useFetch';
import ErrorMessage from './ErrorMessage';
import Field, { fieldProps } from './Field';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  source: CorrectionSource;
  id: number;
  date: string;
  currentStatus: AttendanceStatus;
  markedAt: string;
  onSaved: () => void;
}

export default function AttendanceCorrections(props: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return <div className="basis-full">
    <button type="button" className="btn-outline !py-1.5 !text-sm" aria-expanded={open} onClick={() => setOpen(!open)}>
      {t(open ? 'review.hideCorrections' : 'review.manageCorrections')}
    </button>
    {open && <CorrectionEditor {...props} />}
  </div>;
}

function CorrectionEditor({ source, id, date, currentStatus, markedAt, onSaved }: Props) {
  const { t, i18n } = useTranslation();
  const fields = useId();
  const events = useFetch(() => getCorrections(source, id, date), [source, id, date]);
  const [status, setStatus] = useState<AttendanceStatus | ''>('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const options: AttendanceStatus[] = source === 'allocation' ? ['PRESENT', 'ABSENT', 'PENDING'] : ['PRESENT', 'ABSENT'];

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!status || status === currentStatus) return;
    setBusy(true);
    setSaved(false);
    setFailure(null);
    try {
      await correctAttendance(source, id, date, status, markedAt, reason);
      setStatus('');
      setReason('');
      setSaved(true);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      events.reload();
      onSaved();
      setBusy(false);
    }
  }

  return <div className="mt-3 space-y-3 rounded-lg bg-slate-50 p-3">
    <form onSubmit={submit} className="space-y-3">
      <p>{t('review.currentMark')} · {t('allocation.status.' + currentStatus)}</p>
      <Field id={fields + '-status'} label={t('review.newMark')}>
        <select {...fieldProps(fields + '-status')} required value={status}
          onChange={(e) => { setStatus(e.target.value as AttendanceStatus | ''); setSaved(false); }}>
          <option value="">{t('review.chooseMark')}</option>
          {options.filter((option) => option !== currentStatus).map((option) =>
            <option key={option} value={option}>{t('allocation.status.' + option)}</option>)}
        </select>
      </Field>
      <Field id={fields + '-reason'} label={t('review.reason')} hint={t('review.reasonHint')}>
        <textarea {...fieldProps(fields + '-reason')} aria-describedby={fields + '-reason-hint'}
          required minLength={12} maxLength={500} value={reason} onChange={(e) => { setReason(e.target.value); setSaved(false); }} />
      </Field>
      <button type="submit" className="btn-primary" disabled={busy || status === currentStatus}>{t('review.saveCorrection')}</button>
    </form>
    {failure && <ErrorMessage message={failure} />}
    {saved && <p role="status" className="text-emerald-800">{t('review.saved')}</p>}
    <h4 className="border-t pt-2 font-bold">{t('review.correctionHistory')}</h4>
    {events.loading && <LoadingSpinner label={t('review.loading')} />}
    {events.error && <ErrorMessage message={events.error} onRetry={events.reload} />}
    {!events.loading && !events.error && events.data?.length === 0 && <p>{t('review.noCorrections')}</p>}
    {!events.loading && !events.error && <ol className="space-y-2">
      {events.data?.map((row) => <li key={row.id} className="rounded border border-slate-200 bg-white p-2 text-sm">
        <p>{t('allocation.status.' + row.previousStatus)} → {t('allocation.status.' + row.newStatus)}</p>
        <p className="whitespace-pre-wrap break-words">{row.reason}</p>
        <time dateTime={row.correctedAt}>{new Date(row.correctedAt).toLocaleString(i18n.language)}</time>
      </li>)}
    </ol>}
  </div>;
}
