import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { displayNameFromEmail } from "@/lib/learner-session";
import { createClient } from "@/lib/supabase/server";

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

export type SessionProfile = {
  id: string;
  email: string;
  name: string;
  roles: Role[];
};

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

export async function getAuthUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

export async function getUserRoles(userId: string): Promise<Role[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId);

  return (data ?? [])
    .map((row) => row.role_id)
    .filter((role): role is Role => (ROLES as readonly string[]).includes(role));
}

export async function requireUser(): Promise<User> {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireRole(...needed: Role[]): Promise<{
  user: User;
  roles: Role[];
}> {
  const user = await requireUser();
  const roles = await getUserRoles(user.id);
  if (!needed.some((role) => hasRole(roles, role))) {
    redirect("/my");
  }
  return { user, roles };
}

export async function requireStaff(): Promise<{ user: User; roles: Role[] }> {
  return requireRole("content_admin", "super_admin");
}

export async function requireOrgAccess(): Promise<{ user: User; roles: Role[] }> {
  return requireRole("org_admin", "content_admin", "super_admin");
}

export async function requireOrgAdmin(organisationId: string): Promise<{
  user: User;
  roles: Role[];
  organisationId: string;
}> {
  const user = await requireUser();
  const roles = await getUserRoles(user.id);
  if (!/^[0-9a-f-]{36}$/i.test(organisationId)) {
    redirect("/my");
  }

  if (isStaff(roles)) {
    return { user, roles, organisationId };
  }

  if (!hasRole(roles, "org_admin")) {
    redirect("/my");
  }

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("organisation_memberships")
    .select("role")
    .eq("organisation_id", organisationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "admin") {
    redirect("/my");
  }

  return { user, roles, organisationId };
}

export async function isStaffUser(): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  const roles = await getUserRoles(user.id);
  return isStaff(roles);
}

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const user = await getAuthUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";
  const name =
    profile?.full_name?.trim() ||
    metadataName.trim() ||
    displayNameFromEmail(user.email ?? "");
  const roles = await getUserRoles(user.id);

  return {
    id: user.id,
    email: user.email ?? "",
    name,
    roles,
  };
}

export async function requireSessionProfile(): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect("/login");
  }
  return profile;
}
