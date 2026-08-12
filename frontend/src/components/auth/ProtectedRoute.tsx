import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks';
import type { UserRole } from '../../types';

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: readonly UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { authenticated, initializing, user } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <main className="auth-loading" aria-live="polite">
        <span className="loading-spinner" aria-hidden="true" />
        <p>Validando sessão...</p>
      </main>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && (!user || !allowedRoles.includes(user.role))) return <Navigate to="/students" replace />;

  return children;
}
