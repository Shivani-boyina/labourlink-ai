
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  HardHat,
  IndianRupee,
  MapPin,
  Search,
  ShieldCheck,
  Smartphone,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { t } = useTranslation();
  const { session } = useAuth();

  const workerSteps = [
    {
      step: '1',
      title: t('homePage.workerStep1Title'),
      desc: t('homePage.workerStep1Desc'),
    },
    {
      step: '2',
      title: t('homePage.workerStep2Title'),
      desc: t('homePage.workerStep2Desc'),
    },
    {
      step: '3',
      title: t('homePage.workerStep3Title'),
      desc: t('homePage.workerStep3Desc'),
    },
  ];

  const contractorSteps = [
    {
      step: '1',
      title: t('homePage.contractorStep1Title'),
      desc: t('homePage.contractorStep1Desc'),
    },
    {
      step: '2',
      title: t('homePage.contractorStep2Title'),
      desc: t('homePage.contractorStep2Desc'),
    },
    {
      step: '3',
      title: t('homePage.contractorStep3Title'),
      desc: t('homePage.contractorStep3Desc'),
    },
  ];

  const highlights = [
    {
      icon: IndianRupee,
      title: t('homePage.highlightWageTitle'),
      text: t('homePage.highlightWageDesc'),
    },
    {
      icon: MapPin,
      title: t('homePage.highlightLocationTitle'),
      text: t('homePage.highlightLocationDesc'),
    },
    {
      icon: Users,
      title: t('homePage.highlightDirectTitle'),
      text: t('homePage.highlightDirectDesc'),
    },
    {
      icon: Smartphone,
      title: t('homePage.highlightMobileTitle'),
      text: t('homePage.highlightMobileDesc'),
    },
  ];

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-blue-900 to-blue-800 text-white shadow-md">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          <div className="grid items-center gap-10 md:grid-cols-12">
            {/* Left Column: Heading & Call to Action */}
            <div className="md:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full bg-blue-700/80 border border-blue-500/40 px-3.5 py-1 text-sm font-semibold text-blue-100">
                <ShieldCheck size={16} className="text-emerald-400" aria-hidden />
                <span>{t('homePage.trustedBadge')}</span>
              </span>

              <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl md:text-5xl lg:leading-tight">
                {t('heroTitle')}
              </h1>

              <p className="mt-4 max-w-xl text-lg leading-relaxed text-blue-100">
                {t('heroDescription')}
              </p>

              {/* Action Buttons */}
              <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
                {session ? (
                  <>
                    <Link
                      to={session.role === 'worker' ? '/worker/dashboard' : '/contractor/dashboard'}
                      className="btn-accent !bg-white !text-blue-900 hover:!bg-blue-50 text-base font-bold shadow-md"
                    >
                      <Briefcase size={20} className="text-blue-700" aria-hidden />
                      <span>{t('dashboard')}</span>
                      <ArrowRight size={18} aria-hidden />
                    </Link>

                    <Link
                      to={session.role === 'worker' ? '/jobs' : '/workers/search'}
                      className="btn border-2 border-white/80 bg-blue-800/40 text-white hover:bg-white/10 text-base font-semibold"
                    >
                      <Search size={18} aria-hidden />
                      <span>{session.role === 'worker' ? t('findWork') : t('findWorkers')}</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/jobs"
                      className="btn-accent !bg-white !text-blue-900 hover:!bg-blue-50 text-base font-bold shadow-md"
                    >
                      <Search size={20} className="text-blue-700" aria-hidden />
                      <span>{t('findWork')}</span>
                      <ArrowRight size={18} aria-hidden />
                    </Link>

                    <Link
                      to="/worker/register"
                      className="btn border-2 border-white/80 bg-blue-800/40 text-white hover:bg-white/10 text-base font-semibold"
                    >
                      <HardHat size={20} aria-hidden />
                      <span>{t('registerAsWorker')}</span>
                    </Link>

                    <Link
                      to="/contractor/register"
                      className="btn border-2 border-blue-400/40 text-blue-100 hover:bg-white/10 text-base font-semibold"
                    >
                      <Building2 size={20} aria-hidden />
                      <span>{t('registerAsContractor')}</span>
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Visual Trust Card */}
            <div className="md:col-span-5">
              <div className="rounded-2xl border border-blue-700 bg-white p-6 text-slate-900 shadow-xl">
                <div className="text-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    {t('homePage.connectsTitle')}
                  </span>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {t('homePage.directFairFast')}
                  </p>
                </div>

                <div className="mt-6 flex items-center justify-between gap-2">
                  <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 shadow-sm border border-blue-100">
                      <HardHat size={28} aria-hidden />
                    </span>
                    <span className="text-sm font-bold text-slate-800">{t('workers')}</span>
                    <span className="text-xs text-slate-500">{t('homePage.findFairWork')}</span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="h-0.5 w-12 bg-blue-300"></span>
                    <span className="my-1 text-xs font-bold text-blue-700">{t('homePage.matchText')}</span>
                    <span className="h-0.5 w-12 bg-blue-300"></span>
                  </div>

                  <div className="flex flex-1 flex-col items-center gap-1.5 text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 shadow-sm border border-blue-100">
                      <Building2 size={28} aria-hidden />
                    </span>
                    <span className="text-sm font-bold text-slate-800">{t('contractors')}</span>
                    <span className="text-xs text-slate-500">{t('homePage.hireWorkforce')}</span>
                  </div>
                </div>

                {/* Direct Benefits Checklist */}
                <div className="mt-6 space-y-2.5 border-t border-slate-100 pt-5 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" aria-hidden />
                    <span>{t('homePage.benefit1')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" aria-hidden />
                    <span>{t('homePage.benefit2')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-emerald-600 shrink-0" aria-hidden />
                    <span>{t('homePage.benefit3')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Two Clear Portals: For Workers & For Contractors */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Worker Portal Card */}
          <div className="card border-2 border-blue-200 bg-gradient-to-br from-white to-blue-50/50 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-700 text-white shadow-sm">
                <HardHat size={26} aria-hidden />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t('homePage.forWorkersTitle')}</h2>
                <p className="text-sm text-slate-600">{t('homePage.forWorkersSubtitle')}</p>
              </div>
            </div>

            <p className="mt-4 text-base text-slate-700">
              {t('homePage.forWorkersDesc')}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/jobs" className="btn-primary flex-1">
                <Search size={18} aria-hidden />
                <span>{t('findWork')}</span>
              </Link>
              {!session && (
                <Link to="/worker/register" className="btn-outline flex-1">
                  <span>{t('registerAsWorker')}</span>
                </Link>
              )}
            </div>
          </div>

          {/* Contractor Portal Card */}
          <div className="card border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 sm:p-8">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-white shadow-sm">
                <Building2 size={26} aria-hidden />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t('homePage.forContractorsTitle')}</h2>
                <p className="text-sm text-slate-600">{t('homePage.forContractorsSubtitle')}</p>
              </div>
            </div>

            <p className="mt-4 text-base text-slate-700">
              {t('homePage.forContractorsDesc')}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              {session?.role === 'contractor' ? (
                <Link to="/contractor/jobs/create" className="btn-primary flex-1">
                  <Briefcase size={18} aria-hidden />
                  <span>{t('createJob')}</span>
                </Link>
              ) : (
                <Link to="/contractor/register" className="btn-primary flex-1">
                  <Building2 size={18} aria-hidden />
                  <span>{t('registerAsContractor')}</span>
                </Link>
              )}
              <Link to="/workers/search" className="btn-outline flex-1">
                <Search size={18} aria-hidden />
                <span>{t('findWorkers')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works: Step by Step */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="text-center">
          <span className="text-sm font-bold uppercase tracking-wider text-blue-700">
            {t('homePage.simpleProcess')}
          </span>
          <h2 className="mt-1 text-3xl font-extrabold text-slate-900">
            {t('howItWorks')}
          </h2>
          <p className="mt-2 text-base text-slate-600">
            {t('homePage.noComplicatedSteps')}
          </p>
        </div>

        {/* Worker Steps */}
        <div className="mt-10">
          <h3 className="flex items-center gap-2 text-xl font-bold text-blue-900">
            <HardHat size={22} className="text-blue-700" aria-hidden />
            <span>{t('homePage.workerStepsTitle')}</span>
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {workerSteps.map((s) => (
              <div key={s.step} className="card relative border-2 border-slate-200/90 bg-white p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-700 text-lg font-bold text-white shadow-sm">
                  {s.step}
                </span>
                <h4 className="mt-3 text-lg font-bold text-slate-900">{s.title}</h4>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contractor Steps */}
        <div className="mt-8">
          <h3 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <Building2 size={22} className="text-blue-700" aria-hidden />
            <span>{t('homePage.contractorStepsTitle')}</span>
          </h3>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {contractorSteps.map((s) => (
              <div key={s.step} className="card relative border-2 border-slate-200/90 bg-white p-5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-lg font-bold text-white shadow-sm">
                  {s.step}
                </span>
                <h4 className="mt-3 text-lg font-bold text-slate-900">{s.title}</h4>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="mx-auto max-w-6xl px-4">
        <div className="rounded-3xl border border-blue-200 bg-blue-50/60 p-8 md:p-12">
          <div className="text-center">
            <span className="text-sm font-bold uppercase tracking-wider text-blue-700">
              {t('homePage.whyChooseTitle')}
            </span>
            <h2 className="mt-1 text-3xl font-extrabold text-slate-900">
              {t('featuresTitle')}
            </h2>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Icon size={24} aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
