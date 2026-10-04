import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useAuth();
  const loc = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
