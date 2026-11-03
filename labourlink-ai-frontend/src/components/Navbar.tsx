
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HardHat, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { session, isLoggedIn, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const role = session?.role;

  const changeLanguage = (language: string) => {
    i18n.changeLanguage(language);
    localStorage.setItem('labourlink-language', language);
  };

  const guestLinks = [
    { to: '/', label: t('home') },
    { to: '/jobs', label: t('findWork') },
    { to: '/worker/register', label: t('forWorkers') },
    { to: '/contractor/register', label: t('forContractors') },
  ];

  const workerLinks = [
    { to: '/', label: t('home') },
    { to: '/jobs', label: t('findWork') },
    { to: '/worker/dashboard', label: t('dashboard') },
    { to: '/worker/profile', label: t('myProfile') },
  ];

  const contractorLinks = [
    { to: '/', label: t('home') },
    { to: '/workers/search', label: t('findWorkers') },
    { to: '/contractor/dashboard', label: t('myJobs') },
    { to: '/contractor/profile', label: t('myProfile') },
  ];

  const links = !isLoggedIn
    ? guestLinks
    : role === 'worker'
      ? workerLinks
      : role === 'contractor'
        ? contractorLinks
        : [];

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 font-medium ${
      isActive
        ? 'bg-navy-50 text-navy-900'
        : 'text-slate-700 hover:bg-slate-100'
    }`;

  const closeMenu = () => setOpen(false);

  const doLogout = () => {
    logout();
    closeMenu();
    navigate('/');
  };

  const languageSelector = (
    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
      <span>{t('language')}:</span>
      <select
        value={i18n.resolvedLanguage?.startsWith('te') ? 'te' : 'en'}
        onChange={(event) => changeLanguage(event.target.value)}
        className="min-h-10 rounded-lg border border-slate-300 bg-white px-2 py-1"
        aria-label={t('language')}
      >
        <option value="en">English</option>
        <option value="te">తెలుగు</option>
      </select>
    </label>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          to="/"
          onClick={closeMenu}
          className="flex items-center gap-2 font-display text-xl font-bold text-navy-900"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 text-safety-400">
            <HardHat size={20} aria-hidden="true" />
          </span>
          LabourLink AI
        </Link>

        {/* Desktop navigation */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Main navigation"
        >
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={linkCls}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {languageSelector}

          {!isLoggedIn ? (
            <>
              <Link to="/login" className="btn-outline !py-2">
                {t('login')}
              </Link>
              <Link to="/worker/register" className="btn-accent !py-2">
                {t('register')}
              </Link>
            </>
          ) : role ? (
            <button
              type="button"
              onClick={doLogout}
              className="btn-primary !py-2"
            >
              <LogOut size={18} aria-hidden="true" />
              {t('logout')}
            </button>
          ) : (
            <>
              <span className="text-sm text-slate-600">
                Please log in again
              </span>
              <button
                type="button"
                onClick={doLogout}
                className="btn-primary !py-2"
              >
                {t('logout')}
              </button>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="rounded-lg p-2 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile navigation */}
      {open && (
        <div
          id="mobile-navigation"
          className="border-t border-slate-200 bg-white px-4 pb-4 md:hidden"
        >
          <nav
            className="flex flex-col gap-1 pt-2"
            aria-label="Mobile navigation"
          >
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={linkCls}
                onClick={closeMenu}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-3 flex flex-col gap-3">
            {languageSelector}

            {!isLoggedIn ? (
              <>
                <Link
                  to="/login"
                  className="btn-outline"
                  onClick={closeMenu}
                >
                  {t('login')}
                </Link>

                <Link
                  to="/worker/register"
                  className="btn-accent"
                  onClick={closeMenu}
                >
                  {t('registerAsWorker')}
                </Link>

                <Link
                  to="/contractor/register"
                  className="btn-outline"
                  onClick={closeMenu}
                >
                  {t('registerAsContractor')}
                </Link>
              </>
            ) : (
              <>
                {!role && (
                  <span className="text-sm text-slate-600">
                    Please log in again to refresh your session.
                  </span>
                )}

                <button
                  type="button"
                  onClick={doLogout}
                  className="btn-primary"
                >
                  {t('logout')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
