import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, CheckCircle2, Clock, Hammer, IndianRupee, MapPin, Users, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Job } from '../types/Job';
import SpeakButton from './SpeakButton';

export const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const open = status?.toUpperCase() === 'OPEN';
  const label = open ? t('jobCard.openAccepting') : t('jobCard.closed');

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase ${
        open
          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          : 'bg-slate-100 text-slate-700 border border-slate-300'
      }`}
    >
      {open ? <CheckCircle2 size={13} className="text-emerald-700" aria-hidden /> : <XCircle size={13} className="text-slate-500" aria-hidden />}
      {label}
    </span>
  );
};

export default function JobCard({ job }: { job: Job }) {
  const { t, i18n } = useTranslation();
  const localizedSkill = t(`workerRegister.skills.${job.requiredSkill}`, job.requiredSkill);

  return (
    <article className="card card-hover flex flex-col justify-between gap-4 border-2 border-slate-200/90 hover:border-blue-400 bg-white">
      {/* Header: Title and Status */}
      <div className="flex items-start justify-between gap-3">
        <div><h3 className="text-xl font-bold text-slate-900 leading-snug line-clamp-2">{job.title}</h3>
          <SpeakButton language={i18n.resolvedLanguage} label={`Read job ${job.title}`} text={`${job.title}. ${job.description}. Required skill: ${localizedSkill}. Location: ${job.location}. ${job.minimumExperience != null ? `Minimum experience: ${job.minimumExperience} years.` : ''} ${job.durationDays != null ? `Duration: ${job.durationDays} days.` : ''} Daily wage: ${job.wagePerDay} rupees. Workers needed: ${job.requiredWorkers}. Status: ${job.status}.`} />
        </div>
        <div className="shrink-0">
          <StatusBadge status={job.status} />
        </div>
      </div>

      {/* Prominent Daily Wage Banner */}
      <div className="flex items-center justify-between rounded-xl bg-blue-50/90 border border-blue-200 px-4 py-2.5">
        <span className="text-sm font-semibold text-blue-900">
          {t('jobDetails.dailyWage')}:
        </span>
        <span className="flex items-center text-xl font-extrabold text-blue-800">
          <IndianRupee size={20} className="text-blue-700 stroke-[2.5]" aria-hidden />
          <span>{job.wagePerDay}</span>
          <span className="ml-1 text-xs font-bold text-blue-700">{t('jobCard.perDay')}</span>
        </span>
      </div>

      {/* Key Job Information List */}
      <ul className="space-y-2 text-sm text-slate-700">
        <li className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-blue-700">
            <Hammer size={16} aria-hidden />
          </span>
          <span className="text-slate-600">{t('jobCard.skill')}:</span>
          <strong className="text-slate-900 font-semibold">{localizedSkill}</strong>
        </li>

        <li className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-blue-700">
            <MapPin size={16} aria-hidden />
          </span>
          <span className="text-slate-600">{t('jobCard.location')}:</span>
          <strong className="text-slate-900 font-semibold">{job.location}</strong>
        </li>

        <li className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-blue-700">
            <Users size={16} aria-hidden />
          </span>
          <span className="text-slate-600">{t('jobDetails.workersNeeded')}:</span>
          <strong className="text-slate-900 font-semibold">{job.requiredWorkers} {t('jobCard.workersNeeded')}</strong>
        </li>

        {job.durationDays != null && (
          <li className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-blue-700">
              <Calendar size={16} aria-hidden />
            </span>
            <span className="text-slate-600">{t('jobDetails.duration')}:</span>
            <strong className="text-slate-900 font-semibold">{job.durationDays} {t('jobDetails.days')}</strong>
          </li>
        )}

        {job.minimumExperience != null && (
          <li className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-blue-700">
              <Clock size={16} aria-hidden />
            </span>
            <span className="text-slate-600">{t('jobDetails.minimumExperience')}:</span>
            <strong className="text-slate-900 font-semibold">{job.minimumExperience} {t('workerDashboard.years')}</strong>
          </li>
        )}
      </ul>

      {/* Large, clearly visible action button */}
      <Link
        to={`/jobs/${job.jobId}`}
        className="btn-primary mt-2 w-full text-center text-base font-semibold py-3 flex items-center justify-center gap-2"
      >
        <span>{t('jobCard.viewAndApply')}</span>
        <ArrowRight size={18} aria-hidden />
      </Link>
    </article>
  );
}
