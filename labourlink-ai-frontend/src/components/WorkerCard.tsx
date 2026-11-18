import { Check, CheckCircle2, Clock, Hammer, IndianRupee, MapPin, Phone, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Worker } from '../types/Worker';
import type { Job } from '../types/Job';
import SpeakButton from './SpeakButton';
import WorkerRating from './WorkerRating';

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export default function WorkerCard({ worker, job, distanceKm }: { worker: Worker; job?: Job; distanceKm?: number }) {
  const { t, i18n } = useTranslation();
  const tags: string[] = [];
  if (job && same(worker.skill, job.requiredSkill)) tags.push(t('workerCard.skillMatchesJob'));
  if (job && same(worker.location, job.location)) tags.push(t('workerCard.locationMatchesJob'));
  if (worker.availability) tags.push(t('workerCard.readyToWork'));
  tags.push(t('workerCard.yearsExperience', { count: worker.experience }));

  const localizedSkill = t(`workerRegister.skills.${worker.skill}`, worker.skill);

  return (
    <article className="card card-hover flex flex-col justify-between gap-4 border-2 border-slate-200/90 hover:border-blue-300 bg-white">
      {/* Header with worker name and availability */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div><h3 className="text-xl font-bold text-slate-900">{worker.name}</h3><SpeakButton language={i18n.resolvedLanguage} label={`Read ${worker.name}'s worker details`} text={`${worker.name}. ${localizedSkill} worker. ${worker.experience} years of experience. Service area ${worker.location}. ${distanceKm != null ? `About ${distanceKm.toFixed(1)} kilometres away.` : ''} ${worker.availability ? 'Available for work.' : 'Currently busy.'} ${worker.expectedWagePerDay != null ? `Expected daily wage: ${worker.expectedWagePerDay} rupees.` : ''} Contact number: ${worker.phone}.`} /></div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
              worker.availability
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-amber-100 text-amber-800 border border-amber-300'
            }`}
          >
            {worker.availability ? (
              <CheckCircle2 size={13} className="text-emerald-700" aria-hidden />
            ) : (
              <XCircle size={13} className="text-amber-700" aria-hidden />
            )}
            {worker.availability ? t('workerCard.availableForWork') : t('workerCard.currentlyBusy')}
          </span>
        </div>
        <WorkerRating average={worker.averageRating} count={worker.reviewCount} />

        {/* Skill badge */}
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-800 border border-blue-200">
          <Hammer size={15} className="text-blue-600" aria-hidden />
          <span>{localizedSkill}</span>
        </div>
      </div>

      {/* Details list */}
      <ul className="space-y-2 text-sm text-slate-700">
        <li className="flex items-center gap-2">
          <Clock size={16} className="text-blue-600 shrink-0" aria-hidden />
          <span className="text-slate-600">{t('workerCard.experienceLabel')}</span>
          <strong className="text-slate-900 font-semibold">{worker.experience} {t('workerDashboard.years')}</strong>
        </li>

        <li className="flex items-center gap-2">
          <MapPin size={16} className="text-blue-600 shrink-0" aria-hidden />
          <span className="text-slate-600">{t('workerCard.locationLabel')}</span>
          <strong className="text-slate-900 font-semibold">{worker.location}{distanceKm != null ? ` · about ${distanceKm.toFixed(1)} km` : ''}</strong>
        </li>

        {worker.expectedWagePerDay != null && (
          <li className="flex items-center gap-2">
            <IndianRupee size={16} className="text-blue-600 shrink-0" aria-hidden />
            <span className="text-slate-600">{t('workerCard.expectedWageLabel')}</span>
            <strong className="text-slate-900 font-semibold">₹{worker.expectedWagePerDay} {t('jobCard.perDay')}</strong>
          </li>
        )}

        <li className="flex items-center gap-2">
          <Phone size={16} className="text-blue-600 shrink-0" aria-hidden />
          <span className="text-slate-600">{t('workerCard.contactLabel')}</span>
          <strong className="text-slate-900 font-semibold">{worker.phone}</strong>
        </li>
      </ul>

      {/* Match tags if any */}
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 pt-1" aria-label={t('workerCard.matchHighlights')}>
          {tags.map((tagText) => (
            <li
              key={tagText}
              className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200"
            >
              <Check size={12} className="text-emerald-600" aria-hidden /> {tagText}
            </li>
          ))}
        </ul>
      )}

      {/* Direct Call Button */}
      <a
        href={`tel:${worker.phone}`}
        className="btn-outline w-full text-center text-sm font-semibold !py-2.5 flex items-center justify-center gap-2 mt-1"
      >
        <Phone size={16} aria-hidden />
        <span>{t('workerCard.callWorker', { phone: worker.phone })}</span>
      </a>
    </article>
  );
}
