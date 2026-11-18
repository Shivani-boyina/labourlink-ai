import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Field, { fieldProps } from '../components/Field';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import {
  confirmSchedule, getAllocations, getAttendance, markAttendance, updateAllocationStatus,
  type Allocation, type AttendanceStatus,
} from '../services/allocationService';
import { useFetch } from '../utils/useFetch';
import AttendanceCorrections from '../components/AttendanceCorrections';

type Role = 'worker' | 'contractor';
const marks: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'PENDING'];
const statusClasses: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-emerald-100 text-emerald-900',
  ABSENT: 'bg-rose-100 text-rose-900',
  PENDING: 'bg-amber-100 text-amber-900',
};

export default function Allocations({ role }: { role: Role }) {
  const { session } = useAuth();
  return <AllocationList key={session?.userId} role={role} />;
}

function AllocationList({ role }: { role: Role }) {
  const { t } = useTranslation();
  const rows = useFetch(() => getAllocations(role), [role]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = rows.data?.find((row) => row.allocationId === selectedId);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:py-12">
      <Link to={`/${role}/dashboard`} className="font-semibold text-blue-700">
        {t(role === 'worker' ? 'workerApplications.backToDashboard' : 'contractorProfile.backToDashboard')}
      </Link>
      <h1 className="text-3xl font-extrabold">{t(role === 'contractor' ? 'allocation.manage' : 'allocation.history')}</h1>
      {rows.loading && <LoadingSpinner label={t('allocation.loading')} />}
      {rows.error && <ErrorMessage message={rows.error} onRetry={rows.reload} />}
      {!rows.loading && !rows.error && rows.data?.length === 0 && <EmptyState title={t('allocation.empty')} />}
      {rows.data && rows.data.length > 0 && !rows.error && (
        <>
          <Field id="allocation-choice" label={t('allocation.choose')}>
            <select {...fieldProps('allocation-choice')} value={selectedId ?? ''}
              onChange={(event) => setSelectedId(event.target.value ? Number(event.target.value) : null)}>
              <option value="">{t('allocation.choose')}</option>
              {rows.data.map((row) => (
                <option key={row.allocationId} value={row.allocationId}>
                  {row.jobTitle}{role === 'contractor' ? ` · ${row.workerName}` : ''} · {t(`allocation.status.${row.status}`)}
                </option>
              ))}
            </select>
          </Field>
          {selected && <AttendancePanel key={selected.allocationId} allocation={selected} role={role} refresh={rows.reload} />}
        </>
      )}
    </main>
  );
}

function AttendancePanel({ allocation, role, refresh }: { allocation: Allocation; role: Role; refresh: () => void }) {
  const { t, i18n } = useTranslation();
  const id = allocation.allocationId;
  const attendance = useFetch(() => getAttendance(role, id), [role, id]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('PENDING');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const canManage = role === 'contractor' && allocation.status === 'ACTIVE';
  const existing = date ? attendance.data?.find((day) => day.workDate === date) : undefined;

  async function save(operation: () => Promise<unknown>, reload: () => void) {
    setBusy(true);
    setFailure(null);
    setSaved(false);
    try {
      await operation();
      reload();
      setSaved(true);
    } catch (error) {
      setFailure(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  function saveMark(event: FormEvent) {
    event.preventDefault();
    void save(() => markAttendance(id, date, status), attendance.reload);
  }

  return (
    <section className="card space-y-5 p-5">
      <div>
        <h2 className="text-xl font-bold">{allocation.jobTitle}</h2>
        <p>{t(`allocation.status.${allocation.status}`)}</p>
        <p className="text-sm text-slate-700">{allocation.startDate && allocation.endDate
          ? `${allocation.startDate} – ${allocation.endDate}` : t('allocation.noSchedule')}</p>
      </div>
      {canManage && !allocation.startDate && (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => {
          event.preventDefault();
          void save(() => confirmSchedule(id, start, end), refresh);
        }}>
          <Field id="allocation-start" label={t('allocation.start')}>
            <input {...fieldProps('allocation-start')} type="date" required value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field id="allocation-end" label={t('allocation.end')}>
            <input {...fieldProps('allocation-end')} type="date" min={start || undefined} required value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <button type="submit" className="btn-primary sm:justify-self-start" disabled={busy}>{t('allocation.confirmSchedule')}</button>
        </form>
      )}
      {canManage && allocation.startDate && allocation.endDate && (
        <form className="grid gap-3 border-t pt-4 sm:grid-cols-2" onSubmit={saveMark}>
          <Field id="attendance-date" label={t('allocation.workDate')}>
            <input {...fieldProps('attendance-date')} type="date" required min={allocation.startDate} max={allocation.endDate}
              value={date} onChange={(event) => {
                const workDate = event.target.value;
                setDate(workDate);
                setStatus(attendance.data?.find((day) => day.workDate === workDate)?.status ?? 'PENDING');
              }} />
          </Field>
          <Field id="attendance-status" label={t('allocation.attendanceStatus')}>
            <select {...fieldProps('attendance-status')} value={status}
              onChange={(event) => setStatus(event.target.value as AttendanceStatus)}>
              {marks.map((mark) => <option value={mark} key={mark}>{t(`allocation.status.${mark}`)}</option>)}
            </select>
          </Field>
          {date && !existing && !attendance.loading && !attendance.error && <p className="text-sm text-amber-900 sm:col-span-2">{t('allocation.unmarked')}</p>}
          {existing && <p className="text-sm sm:col-span-2">{t('review.useCorrection')}</p>}
          <button type="submit" className="btn-primary sm:justify-self-start" disabled={busy || Boolean(existing) || attendance.loading || Boolean(attendance.error)}>{t('allocation.saveMark')}</button>
        </form>
      )}
      {failure && <ErrorMessage message={failure} />}
      {saved && <p role="status" className="text-sm text-emerald-800">{t('allocation.saved')}</p>}
      <h3 className="border-t pt-4 font-bold">{t('allocation.history')}</h3>
      {attendance.loading && <LoadingSpinner label={t('allocation.loading')} />}
      {attendance.error && <ErrorMessage message={attendance.error} onRetry={attendance.reload} />}
      {!attendance.loading && !attendance.error && attendance.data?.length === 0 && <p>{t('allocation.noMarks')}</p>}
      {!attendance.error && attendance.data && (
        <ul className="divide-y">
          {attendance.data.map((day) => (
            <li key={day.workDate} className="flex flex-wrap items-center gap-2 py-2">
              <time dateTime={day.workDate}>{day.workDate}</time>
              <span className={`rounded-full px-2 py-1 text-sm font-medium ${statusClasses[day.status]}`}>
                {t(`allocation.status.${day.status}`)}
              </span>
              <time className="text-sm text-slate-600" dateTime={day.markedAt}>
                {t('allocation.markedAt', { time: new Date(day.markedAt).toLocaleString(i18n.language) })}
              </time>
              {role === 'contractor' && <AttendanceCorrections source="allocation" id={id} date={day.workDate}
                currentStatus={day.status} markedAt={day.markedAt} onSaved={attendance.reload} />}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <div className="flex flex-wrap gap-3 border-t pt-4">
          <button type="button" className="btn-outline" disabled={busy} onClick={() => {
            if (window.confirm(t('allocation.confirmComplete'))) void save(() => updateAllocationStatus(id, 'COMPLETED'), refresh);
          }}>{t('allocation.complete')}</button>
          <button type="button" className="btn-outline text-rose-700" disabled={busy} onClick={() => {
            if (window.confirm(t('allocation.confirmCancel'))) void save(() => updateAllocationStatus(id, 'CANCELLED'), refresh);
          }}>{t('allocation.cancel')}</button>
        </div>
      )}
    </section>
  );
}
