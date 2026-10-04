import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { HardHat, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'Home' },
  { to: '/jobs', label: 'Find Work' },
  { to: '/worker/register', label: 'For Workers' },
  { to: '/contractor/register', label: 'For Contractors' },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const { isLoggedIn, logout } = useAuth();
  const nav = useNavigate();

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 font-medium ${isActive ? 'bg-navy-50 text-navy-900' : 'text-slate-700 hover:bg-slate-100'}`;

  const doLogout = () => { logout(); setOpen(false); nav('/'); };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-navy-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-800 text-safety-400"><HardHat size={20} aria-hidden /></span>
          LabourLink AI
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={linkCls}>{l.label}</NavLink>)}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isLoggedIn ? (
            <>
              <Link to="/contractor/dashboard" className="btn-outline !py-2">Dashboard</Link>
              <button type="button" onClick={doLogout} className="btn-primary !py-2"><LogOut size={18} aria-hidden /> Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-outline !py-2">Login</Link>
              <Link to="/worker/register" className="btn-accent !py-2">Register</Link>
            </>
          )}
        </div>

        <button type="button" className="rounded-lg p-2 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 pt-2" aria-label="Mobile">
            {links.map((l) => <NavLink key={l.to} to={l.to} end={l.to === '/'} className={linkCls} onClick={() => setOpen(false)}>{l.label}</NavLink>)}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            {isLoggedIn ? (
              <>
                <Link to="/contractor/dashboard" className="btn-outline" onClick={() => setOpen(false)}>Dashboard</Link>
                <button type="button" onClick={doLogout} className="btn-primary">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn-outline" onClick={() => setOpen(false)}>Login</Link>
                <Link to="/worker/register" className="btn-accent" onClick={() => setOpen(false)}>Register as Worker</Link>
                <Link to="/contractor/register" className="btn-outline" onClick={() => setOpen(false)}>Register as Contractor</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
