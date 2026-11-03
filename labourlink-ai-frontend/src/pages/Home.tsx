
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftRight,
  Briefcase,
  Building2,
  HardHat,
  MapPin,
  Search,
  ShieldCheck,
  Users,
  UserCheck,
} from 'lucide-react';

export default function Home() {
  const { t } = useTranslation();

  const features = [
    {
      icon: Search,
      title: t('skillMatching'),
      text: t('skillMatchingText'),
    },
    {
      icon: MapPin,
      title: t('locationWork'),
      text: t('locationWorkText'),
    },
    {
      icon: UserCheck,
      title: t('workerAvailability'),
      text: t('workerAvailabilityText'),
    },
    {
      icon: Users,
      title: t('workforceManagement'),
      text: t('workforceManagementText'),
    },
  ];

  const steps = [
    t('step1'),
    t('step2'),
    t('step3'),
    t('step4'),
    t('step5'),
  ];

  return (
    <>
      <section className="bg-navy-900 text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <h1 className="text-4xl font-bold leading-tight text-white md:text-5xl">
              {t('heroTitle')}
            </h1>

            <p className="mt-5 max-w-xl text-lg text-slate-200">
              {t('heroDescription')}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <Link to="/jobs" className="btn-accent">
                {t('findWork')}
              </Link>

              <Link
                to="/login"
                className="btn border-2 border-white text-white hover:bg-white/10"
              >
                {t('hireWorkers')}
              </Link>

              <Link
                to="/worker/register"
                className="btn border-2 border-white/40 text-white hover:bg-white/10"
              >
                {t('registerAsWorker')}
              </Link>

              <Link
                to="/contractor/register"
                className="btn border-2 border-white/40 text-white hover:bg-white/10"
              >
                {t('registerAsContractor')}
              </Link>
            </div>
          </div>

          <div
            className="rounded-2xl bg-white p-6 text-navy-900"
            aria-label="Workers, jobs and contractors are connected"
          >
            <div className="flex items-center justify-between gap-2 text-center">
              <div className="flex flex-col items-center gap-2">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-50">
                  <HardHat size={30} aria-hidden />
                </span>
                <span className="font-semibold">{t('workers')}</span>
              </div>

              <ArrowLeftRight className="text-safety-600" aria-hidden />

              <div className="flex flex-col items-center gap-2">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-safety-400">
                  <Briefcase size={30} aria-hidden />
                </span>
<span className="font-semibold">{t('jobs.title')}</span>              </div>

              <ArrowLeftRight className="text-safety-600" aria-hidden />

              <div className="flex flex-col items-center gap-2">
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-navy-50">
                  <Building2 size={30} aria-hidden />
                </span>
                <span className="font-semibold">{t('contractors')}</span>
              </div>
            </div>

            <div className="hazard my-5 h-3 rounded" aria-hidden />

            <p className="flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck size={18} aria-hidden />
              {t('matchingRules')}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h2 className="text-3xl font-bold">{t('featuresTitle')}</h2>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="card">
              <Icon className="text-navy-700" aria-hidden />
              <h3 className="mt-3 text-lg font-semibold">{title}</h3>
              <p className="mt-1 text-slate-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <h2 className="text-3xl font-bold">{t('howItWorks')}</h2>

        <ol className="mt-6 grid gap-3 md:grid-cols-5">
          {steps.map((step, index) => (
            <li
              key={index}
              className="card flex items-center gap-3 md:flex-col md:text-center"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-800 font-bold text-white">
                {index + 1}
              </span>
              <span className="font-semibold">{step}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
