import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { Permission } from '@kadsamhsa/domain';
import { routes } from '../data/site';
import { useAuth } from './AuthProvider';

/**
 * Hides a route from anyone lacking `permission`.
 *
 * This is navigation convenience only. Every admin endpoint enforces the same
 * permission server-side, so removing this component would change what a
 * learner *sees*, not what they can *do*.
 */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return <p className="kadsamhsa-container kadsamhsa-lead">Loading…</p>;
  }

  if (!user) {
    return <Navigate to={routes.login} state={{ from: location.pathname }} replace />;
  }

  if (!can(permission)) {
    // A signed-in learner who lands on /admin is not lost, they are not staff —
    // send them somewhere useful rather than to a login form.
    return <Navigate to={routes.dashboard} replace />;
  }

  return <>{children}</>;
}
