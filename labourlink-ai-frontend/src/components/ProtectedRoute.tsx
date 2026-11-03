
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
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
  const { isLoggedIn, session } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/login"
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
