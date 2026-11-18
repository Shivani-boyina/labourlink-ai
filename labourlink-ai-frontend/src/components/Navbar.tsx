import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Briefcase, Building2, Globe, HardHat, LogOut, Menu, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
}

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isLoggedIn, session, logout, authStatus, isLoading, retryAuthCheck } = useAuth();
  const { t, i18n } = useTranslation();
  const nav = useNavigate();

  const publicLinks: NavItem[] = [
    { to: '/', label: t('home') },
    { to: '/jobs', label: t('findWork') },
    { to: '/worker/register', label: t('registerAsWorker') },
    { to: '/contractor/register', label: t('registerAsContractor') },
  ];

  const workerLinks: NavItem[] = [
    { to: '/worker/dashboard', label: t('dashboard') },
    { to: '/jobs', label: t('findWork') },
    { to: '/worker/applications', label: t('myApplications') },
    { to: '/worker/profile', label: t('myProfile') },
  ];

  const contractorLinks: NavItem[] = [
    { to: '/contractor/dashboard', label: t('dashboard') },
    { to: '/contractor/jobs/create', label: t('createJob') },
    { to: '/workers/search', label: t('findWorkers') },
    { to: '/jobs', label: t('jobs.title') },
    { to: '/contractor/profile', label: t('myProfile') },
  ];

  const awaitingIdentity = authStatus === 'unavailable' && !session;
  const links = isLoading || awaitingIdentity
    ? []
    : !isLoggedIn
      ? publicLinks
      : session?.role === 'worker'
        ? workerLinks
        : contractorLinks;

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-base font-semibold transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-800'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const mobileLinkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
      isActive
        ? 'bg-blue-50 text-blue-800'
        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const doLogout = () => {
    logout();
    setOpen(false);
    nav('/');
  };

  const changeLanguage = (language: string) => {
    void i18n.changeLanguage(language);
    try {
      localStorage.setItem('labourlink-language', language);
    } catch {
      // Language still changes for this session when browser storage is unavailable.
    }
  };

  const languagePicker = (
    <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm font-medium text-slate-700">
      <Globe size={16} className="text-blue-600" aria-hidden />
      <span className="sr-only">{t('language')}</span>
      <select
        className="bg-transparent py-1 pr-1 font-semibold text-slate-800 focus:outline-none"
        aria-label={t('language')}
        value={i18n.resolvedLanguage?.startsWith('te') ? 'te' : 'en'}
        onChange={(event) => changeLanguage(event.target.value)}
      >
        <option value="en">English</option>
        <option value="te">తెలుగు</option>
      </select>
    </div>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        {/* Brand Logo */}
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-sm">
            <HardHat size={22} aria-hidden />
          </span>
          <div className="flex flex-col">
            <span className="font-display text-xl font-bold tracking-tight text-blue-900">
              LabourLink AI
            </span>
            <span className="hidden text-xs font-medium text-slate-500 sm:inline">
              {t('nav.platformTagline')}
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 md:flex" aria-label={t('navigation.main')}>
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={linkCls}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right side controls */}
        <div className="hidden items-center gap-2.5 md:flex">
          {languagePicker}

          {isLoading ? (
            <span role="status" className="px-2 text-sm text-slate-600">{t('auth.checking')}</span>
          ) : awaitingIdentity ? (
            <>
              <button type="button" onClick={() => void retryAuthCheck()} className="btn-outline !py-2 !text-sm">
                {t('auth.retry')}
              </button>
              <button type="button" onClick={doLogout} className="btn-outline !py-2 !text-sm">
                {t('logout')}
              </button>
            </>
          ) : isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-900">
                {session?.role === 'worker' ? (
                  <HardHat size={14} className="text-blue-700" aria-hidden />
                ) : (
                  <Building2 size={14} className="text-blue-700" aria-hidden />
                )}
                <span>{session?.role === 'worker' ? t('nav.workerRole') : t('nav.contractorRole')}:</span>
                <span className="max-w-[120px] truncate">{session?.name}</span>
              </span>
              <button
                type="button"
                onClick={doLogout}
                className="btn-outline !py-2 !px-3.5 !text-sm"
              >
                <LogOut size={16} aria-hidden /> {t('logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-outline !py-2 !px-4 !text-sm">
                <User size={16} aria-hidden /> {t('login')}
              </Link>
              <Link to="/worker/register" className="btn-primary !py-2 !px-4 !text-sm">
                <Briefcase size={16} aria-hidden /> {t('register')}
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu toggle */}
        <div className="flex items-center gap-2 md:hidden">
          {languagePicker}
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 focus:ring-2 focus:ring-blue-600"
            aria-label={open ? t('navigation.closeMenu') : t('navigation.openMenu')}
            aria-expanded={open}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          {isLoggedIn && (
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-900">
              {session?.role === 'worker' ? (
                <HardHat size={18} className="text-blue-700" aria-hidden />
              ) : (
                <Building2 size={18} className="text-blue-700" aria-hidden />
              )}
              <span>
                {session?.role === 'worker' ? t('nav.workerRole') : t('nav.contractorRole')}: {session?.name} ({session?.phone})
              </span>
            </div>
          )}

          <nav className="flex flex-col gap-1.5" aria-label={t('navigation.mobile')}>
            {links.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={mobileLinkCls}
                onClick={() => setOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-4">
            {isLoading ? (
              <span role="status" className="py-2 text-center text-sm text-slate-600">
                {t('auth.checking')}
              </span>
            ) : awaitingIdentity ? (
              <>
                <button type="button" onClick={() => void retryAuthCheck()} className="btn-outline w-full">
                  {t('auth.retry')}
                </button>
                <button type="button" onClick={doLogout} className="btn-outline w-full">
                  {t('logout')}
                </button>
              </>
            ) : isLoggedIn ? (
              <button type="button" onClick={doLogout} className="btn-outline w-full">
                <LogOut size={18} aria-hidden /> {t('logout')}
              </button>
            ) : (
              <>
                <Link to="/login" className="btn-outline w-full" onClick={() => setOpen(false)}>
                  <User size={18} aria-hidden /> {t('login')}
                </Link>
                <Link to="/worker/register" className="btn-primary w-full" onClick={() => setOpen(false)}>
                  <HardHat size={18} aria-hidden /> {t('registerAsWorker')}
                </Link>
                <Link to="/contractor/register" className="btn-outline w-full" onClick={() => setOpen(false)}>
                  <Building2 size={18} aria-hidden /> {t('registerAsContractor')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {authStatus === 'unavailable' && session && (
        <div role="status" className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-center text-sm text-amber-900">
          {t('auth.unavailable')}
          <button type="button" className="ml-2 font-semibold text-blue-700 underline" onClick={() => void retryAuthCheck()}>
            {t('auth.retry')}
          </button>
        </div>
      )}
    </header>
  );
}
