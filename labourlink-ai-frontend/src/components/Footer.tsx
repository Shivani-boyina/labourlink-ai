import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, Building2, HardHat, ShieldCheck, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Footer() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const worker = session?.role === 'worker';
  const contractor = session?.role === 'contractor';

  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-900 text-slate-300">
      {/* Decorative clean gradient divider */}
      <div className="h-1.5 w-full bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400" aria-hidden />

      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Info */}
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <HardHat size={20} aria-hidden />
              </span>
              <span className="font-display text-xl font-bold text-white">LabourLink AI</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {t('footer.description')}
            </p>
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
              <ShieldCheck size={16} className="text-emerald-400" aria-hidden />
              <span>{t('footer.tagline')}</span>
            </p>
          </div>

          {/* Worker Navigation */}
          <div>
            <p className="flex items-center gap-2 font-semibold text-white">
              <HardHat size={18} className="text-blue-400" aria-hidden />
              {t('footer.workers')}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link className="hover:text-white hover:underline" to="/jobs">
                  {t('footer.findWork')}
                </Link>
              </li>
              {!session && (
                <>
                  <li>
                    <Link className="hover:text-white hover:underline" to="/worker/register">
                      {t('footer.registerWorker')}
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-white hover:underline" to="/worker/login">
                      {t('login')}
                    </Link>
                  </li>
                </>
              )}
              {worker && (
                <>
                  <li>
                    <Link className="hover:text-white hover:underline" to="/worker/dashboard">
                      {t('dashboard')}
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-white hover:underline" to="/worker/applications">
                      {t('myApplications')}
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-white hover:underline" to="/worker/profile">
                      {t('myProfile')}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Contractor Navigation */}
          <div>
            <p className="flex items-center gap-2 font-semibold text-white">
              <Building2 size={18} className="text-blue-400" aria-hidden />
              {t('footer.contractors')}
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              {!session && (
                <>
                  <li>
                    <Link className="hover:text-white hover:underline" to="/contractor/register">
                      {t('footer.registerContractor')}
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-white hover:underline" to="/login">
                      {t('login')}
                    </Link>
                  </li>
                </>
              )}
              {contractor && (
                <>
                  <li>
                    <Link className="hover:text-white hover:underline" to="/contractor/dashboard">
                      {t('dashboard')}
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-white hover:underline" to="/contractor/jobs/create">
                      {t('createJob')}
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-white hover:underline" to="/workers/search">
                      {t('findWorkers')}
                    </Link>
                  </li>
                  <li>
                    <Link className="hover:text-white hover:underline" to="/contractor/profile">
                      {t('myProfile')}
                    </Link>
                  </li>
                </>
              )}
              <li>
                <Link className="hover:text-white hover:underline" to="/jobs">
                  {t('jobs.title')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Note */}
          <div>
            <p className="flex items-center gap-2 font-semibold text-white">
              <Briefcase size={18} className="text-blue-400" aria-hidden />
              {t('footer.project')}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {t('footer.projectDescription')}
            </p>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} LabourLink AI. {t('footer.rights')}</p>
          <p className="flex items-center gap-1">{t('footer.madeWithCare')} <Heart size={14} className="text-rose-500 fill-rose-500 inline" aria-hidden /></p>
        </div>
      </div>
    </footer>
  );
}
