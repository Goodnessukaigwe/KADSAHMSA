/**
 * Dual-check permissions (PRD §8.2).
 *
 * 1. Supabase RLS isolates rows in Postgres.
 * 2. This module is used on Server Actions / Route Handlers.
 *
 * Only the server check is load-bearing. The client may hide controls.
 */

export const ROLES = [
  "learner",
  "org_admin",
  "content_admin",
  "super_admin",
] as const;

export type Role = (typeof ROLES)[number];

export function hasRole(roles: readonly Role[], role: Role): boolean {
  return roles.includes(role);
}

export function isStaff(roles: readonly Role[]): boolean {
  return roles.some((role) => role === "content_admin" || role === "super_admin");
}

export function assertRole(roles: readonly Role[], role: Role): void {
  if (!hasRole(roles, role)) {
    throw new Error("Forbidden");
  }
}
