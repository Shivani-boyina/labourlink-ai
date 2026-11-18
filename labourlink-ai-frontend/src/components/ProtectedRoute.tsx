
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

type UserRole = 'worker' | 'contractor';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: UserRole;
}

export default function ProtectedRoute({
  children,
  allowedRole,
}: ProtectedRouteProps) {
  const { isLoggedIn, session, authStatus, isLoading, retryAuthCheck, logout } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (isLoading) return <AuthCheckNotice message={t('auth.checking')} />;
  if (authStatus === 'unavailable' && !session) {
    return <AuthCheckNotice message={t('auth.unavailable')} retry={retryAuthCheck} logout={logout} />;
  }

  if (!isLoggedIn) {
    return (
      <Navigate
        to={allowedRole === 'worker' ? '/worker/login' : '/login'}
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  if (allowedRole && session?.role !== allowedRole) {
    const dashboard =
      session?.role === 'worker'
        ? '/worker/dashboard'
        : '/contractor/dashboard';

    return <Navigate to={dashboard} replace />;
  }

  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { session, authStatus, isLoading, retryAuthCheck, logout } = useAuth();
  const { t } = useTranslation();
  if (isLoading) return <AuthCheckNotice message={t('auth.checking')} />;
  if (authStatus === 'unavailable' && !session) {
    return <AuthCheckNotice message={t('auth.unavailable')} retry={retryAuthCheck} logout={logout} />;
  }
  if (session) {
    return <Navigate to={session.role === 'worker' ? '/worker/dashboard' : '/contractor/dashboard'} replace />;
  }
  return <>{children}</>;
}

function AuthCheckNotice({
  message,
  retry,
  logout,
}: {
  message: string;
  retry?: () => Promise<void>;
  logout?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-xl px-4 py-10" role="status" aria-live="polite">
      <div className="card space-y-4 text-center">
        <p>{message}</p>
        {retry && <button type="button" className="btn-primary" onClick={() => void retry()}>{t('auth.retry')}</button>}
        {logout && <button type="button" className="btn-outline" onClick={logout}>{t('logout')}</button>}
      </div>
    </div>
  );
}
