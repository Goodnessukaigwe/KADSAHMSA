import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { routes } from '../data/site';
import { useAuth } from './AuthProvider';

/**
 * Gate for learner-only routes. This is a routing convenience, not a security
 * boundary — the API refuses the underlying requests regardless.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="kadsamhsa-container kadsamhsa-lead">Loading…</p>;
  }

  if (!user) {
    return <Navigate to={routes.login} state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
