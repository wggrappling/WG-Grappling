import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks';

type ProtectedRouteProps = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { authenticated, initializing } = useAuth();
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

  return children;
}
