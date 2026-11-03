
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-16 bg-navy-900 text-slate-300">
      <div className="hazard h-2" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <p className="font-display text-xl font-bold text-white">
            LabourLink AI
          </p>
          <p className="mt-2 text-sm">{t('footer.description')}</p>
        </div>

        <div>
          <p className="mb-2 font-semibold text-white">
            {t('footer.workers')}
          </p>
          <ul className="space-y-1 text-sm">
            <li>
              <Link className="hover:text-white" to="/worker/register">
                {t('footer.registerWorker')}
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" to="/jobs">
                {t('footer.findWork')}
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" to="/worker/dashboard">
                {t('footer.myProfile')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 font-semibold text-white">
            {t('footer.contractors')}
          </p>
          <ul className="space-y-1 text-sm">
            <li>
              <Link className="hover:text-white" to="/contractor/register">
                {t('footer.registerContractor')}
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" to="/login">
                {t('footer.login')}
              </Link>
            </li>
            <li>
              <Link className="hover:text-white" to="/contractor/jobs/create">
                {t('footer.createJob')}
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <p className="mb-2 font-semibold text-white">
            {t('footer.project')}
          </p>
          <p className="text-sm">{t('footer.projectDescription')}</p>
        </div>
      </div>
    </footer>
  );
}
