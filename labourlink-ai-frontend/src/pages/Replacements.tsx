import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { errorMessage } from '../services/api';
import {
  cancelReplacementOffer, cancelReplacementRequest, getReplacementCandidates, getReplacementOffers,
  getReplacementWorkspace, markReplacement, newReplacementRequest, respondToReplacementOffer,
  sendReplacementOffer, type ReplacementOffer,
} from '../services/replacementService';
import { useFetch } from '../utils/useFetch';
import AttendanceCorrections from '../components/AttendanceCorrections';

export default function Replacements({ role }: { role: 'worker' | 'contractor' }) {
  const { t } = useTranslation();
  const { session } = useAuth();
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:py-12">
      <Link to={`/${role}/dashboard`} className="font-semibold text-blue-700">
        {t(role === 'worker' ? 'workerApplications.backToDashboard' : 'contractorProfile.backToDashboard')}
      </Link>
      <h1 className="text-3xl font-extrabold">{t(role === 'worker' ? 'replacement.offers' : 'replacement.manage')}</h1>
      {role === 'worker' ? <WorkerOffers key={session?.userId} /> : <ContractorWorkspace key={session?.userId} />}
    </main>
  );
}

function useAction(reload: () => void) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setSaved(false);
    setFailure(null);
    try {
      await action();
      reload();
      setSaved(true);
    } catch (error) {
      setFailure(errorMessage(error));
      reload();
    } finally {
      setBusy(false);
    }
  }
  return { busy, failure, saved, run };
}

function Feedback({ failure, saved }: { failure: string | null; saved: boolean }) {
  const { t } = useTranslation();
  return <>
    {failure && <ErrorMessage message={failure} />}
    {saved && <p role="status" className="text-sm font-medium text-emerald-800">{t('replacement.saved')}</p>}
  </>;
}

function OfferDetails({ offer, children }: { offer: ReplacementOffer; children?: ReactNode }) {
  const { t, i18n } = useTranslation();
  return (
    <li className="space-y-2 rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <strong>{offer.workerName ? `${offer.jobTitle} · ${offer.workerName}` : offer.jobTitle}</strong>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-sm font-semibold">{t('replacement.state.' + offer.state)}</span>
      </div>
      <p className="text-sm text-slate-700">{offer.workDate} · {offer.jobLocation}{offer.dailyWage == null ? '' : ` · ₹${offer.dailyWage}`}</p>
      {offer.state === 'PENDING' && <p className="text-sm">{t('replacement.expires', { time: new Date(offer.expiresAt).toLocaleString(i18n.language) })}</p>}
      {offer.state === 'ACCEPTED' && <p className="text-sm font-medium">{t('replacement.attendance')} · {offer.attendanceStatus
        ? t('allocation.status.' + offer.attendanceStatus) : t('replacement.unmarked')}</p>}
      {children}
    </li>
  );
}

function WorkerOffers() {
  const { t } = useTranslation();
  const offers = useFetch(getReplacementOffers, []);
  const action = useAction(offers.reload);
  return <>
    <Feedback {...action} />
    {offers.loading && <LoadingSpinner label={t('replacement.loading')} />}
    {offers.error && <ErrorMessage message={offers.error} onRetry={offers.reload} />}
    {!offers.loading && !offers.error && offers.data?.length === 0 && <EmptyState title={t('replacement.noOffers')} />}
    {!offers.loading && !offers.error && offers.data && <ul className="grid gap-4 sm:grid-cols-2">
      {offers.data.map((offer) => (
        <OfferDetails key={offer.offerId} offer={offer}>
          {offer.state === 'PENDING' && <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={action.busy} onClick={() => void action.run(() => respondToReplacementOffer(offer.offerId, 'ACCEPT'))}>{t('replacement.accept')}</button>
            <button className="btn-outline" disabled={action.busy} onClick={() => void action.run(() => respondToReplacementOffer(offer.offerId, 'DECLINE'))}>{t('replacement.decline')}</button>
          </div>}
        </OfferDetails>
      ))}
    </ul>}
  </>;
}

function ContractorWorkspace() {
  const { t } = useTranslation();
  const workspace = useFetch(getReplacementWorkspace, []);
  const action = useAction(workspace.reload);
  const [candidateRequest, setCandidateRequest] = useState<number | null>(null);
  if (workspace.error) return <ErrorMessage message={workspace.error} onRetry={workspace.reload} />;
  return <>
    <Feedback {...action} />
    {workspace.loading && <LoadingSpinner label={t('replacement.loading')} />}
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{t('replacement.absences')}</h2>
      {!workspace.loading && workspace.data?.absences.length === 0 && <EmptyState title={t('replacement.noAbsences')} />}
      <ul className="grid gap-3 sm:grid-cols-2">
        {workspace.data?.absences.map((absence) => (
          <li key={`${absence.allocationId}-${absence.workDate}`} className="card space-y-2 p-4">
            <strong>{absence.jobTitle} · {absence.workerName}</strong>
            <p>{absence.workDate} · {t('allocation.status.ABSENT')}</p>
            {absence.requestable && <button className="btn-primary" disabled={action.busy || workspace.loading}
              onClick={() => void action.run(() => newReplacementRequest(absence.allocationId, absence.workDate))}>{t('replacement.request')}</button>}
          </li>
        ))}
      </ul>
    </section>
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{t('replacement.requests')}</h2>
      {!workspace.loading && workspace.data?.requests.length === 0 && <EmptyState title={t('replacement.noRequests')} />}
      {workspace.data?.requests.map((row) => (
        <article key={row.requestId} className="card space-y-3 p-5">
          <h3 className="font-bold">{row.jobTitle} · {row.absentWorkerName}</h3>
          <p>{row.workDate} · {t('replacement.state.' + row.state)}</p>
          {row.state === 'OPEN' && <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={action.busy || workspace.loading}
              onClick={() => setCandidateRequest((id) => id === row.requestId ? null : row.requestId)}>{t('replacement.candidates')}</button>
            <button className="btn-outline" disabled={action.busy || workspace.loading}
              onClick={() => void action.run(() => cancelReplacementRequest(row.requestId))}>{t('replacement.cancelRequest')}</button>
          </div>}
          {row.state === 'OPEN' && candidateRequest === row.requestId && <Candidates id={row.requestId} refresh={workspace.reload} />}
          <ul className="space-y-2">
            {row.offers.map((offer) => (
              <OfferDetails key={offer.offerId} offer={offer}>
                {offer.state === 'PENDING' && <button className="btn-outline" disabled={action.busy || workspace.loading}
                  onClick={() => void action.run(() => cancelReplacementOffer(row.requestId, offer.offerId))}>{t('replacement.cancelOffer')}</button>}
                {offer.state === 'ACCEPTED' && !offer.attendanceStatus && <div className="flex flex-wrap gap-2">
                  {(['PRESENT', 'ABSENT'] as const).map((status) => (
                    <button key={status} className="btn-outline" disabled={action.busy || workspace.loading}
                      onClick={() => void action.run(() => markReplacement(row.requestId, row.workDate, status))}>
                      {t('replacement.mark', { status: t('allocation.status.' + status) })}
                    </button>
                  ))}
                </div>}
                {offer.state === 'ACCEPTED' && offer.attendanceStatus && offer.markedAt &&
                  <AttendanceCorrections source="replacement" id={row.requestId} date={row.workDate}
                    currentStatus={offer.attendanceStatus} markedAt={offer.markedAt} onSaved={workspace.reload} />}
              </OfferDetails>
            ))}
          </ul>
        </article>
      ))}
    </section>
  </>;
}

function Candidates({ id, refresh }: { id: number; refresh: () => void }) {
  const { t } = useTranslation();
  const rows = useFetch(() => getReplacementCandidates(id), [id]);
  const action = useAction(() => { rows.reload(); refresh(); });
  return <div className="space-y-2 border-t pt-3">
    <Feedback {...action} />
    {rows.loading && <LoadingSpinner label={t('replacement.loading')} />}
    {rows.error && <ErrorMessage message={rows.error} onRetry={rows.reload} />}
    {!rows.loading && !rows.error && rows.data?.length === 0 && <p>{t('replacement.noCandidates')}</p>}
    {!rows.loading && !rows.error && <ul className="grid gap-2 sm:grid-cols-2">
      {rows.data?.map((candidate) => (
        <li key={candidate.workerId} className="space-y-2 rounded-xl bg-slate-50 p-4">
          <strong>{candidate.workerName}</strong>
          <p className="text-sm">{t('workerRegister.skills.' + candidate.skill, candidate.skill)} · {candidate.location}</p>
          <p className="text-sm text-slate-700">{candidate.reasons.map((reason) => t('replacement.reason.' + reason)).join(' · ')}</p>
          <button className="btn-outline" disabled={action.busy}
            onClick={() => void action.run(() => sendReplacementOffer(id, candidate.workerId))}>{t('replacement.send')}</button>
        </li>
      ))}
    </ul>}
  </div>;
}
