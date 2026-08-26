/**
 * Roles and permissions — the single source of truth for both sides.
 *
 * The web client uses these to decide which controls to render; the API uses
 * them to decide which requests to refuse. Only the API's check is
 * load-bearing: a hidden button is a convenience, not a security boundary.
 *
 * Roles are additive. A user holding several roles gets the union of their
 * permissions.
 */

export const ROLES = [
  'learner',
  'org_admin',
  'content_admin',
  'super_admin',
] as const;

export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  // Learning — the acting user's own records only.
  'course:enrol',
  'progress:write:own',
  'quiz:attempt',
  'certificate:read:own',
  'payment:read:own',

  // Organisation — scoped to organisations the user administers.
  'org:member:invite',
  'org:member:import',
  'org:seat:allocate',
  'org:report:read',

  // Content authoring.
  'course:create',
  'course:update',
  'course:publish',
  'course:delete',
  'quiz:manage',
  'certificate_template:manage',

  // Platform administration.
  'user:read',
  'user:manage',
  'role:assign',
  'organisation:manage',
  'offer:manage',
  'payment:read:all',
  'certificate:revoke',
  'report:export',
  'audit:read',
  // Branding, contact details and integrations. Super admin only — content
  // admins publish courses, they do not reconfigure the school.
  'settings:manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const LEARNER_PERMISSIONS: Permission[] = [
  'course:enrol',
  'progress:write:own',
  'quiz:attempt',
  'certificate:read:own',
  'payment:read:own',
];

const ORG_ADMIN_PERMISSIONS: Permission[] = [
  ...LEARNER_PERMISSIONS,
  'org:member:invite',
  'org:member:import',
  'org:seat:allocate',
  'org:report:read',
];

const CONTENT_ADMIN_PERMISSIONS: Permission[] = [
  ...LEARNER_PERMISSIONS,
  'course:create',
  'course:update',
  'course:publish',
  'course:delete',
  'quiz:manage',
  'certificate_template:manage',
  'user:read',
  'report:export',
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  learner: LEARNER_PERMISSIONS,
  org_admin: ORG_ADMIN_PERMISSIONS,
  content_admin: CONTENT_ADMIN_PERMISSIONS,
  // Super admin holds everything, including permissions added later.
  super_admin: PERMISSIONS,
};

export function permissionsForRoles(roles: readonly Role[]): Set<Permission> {
  const granted = new Set<Permission>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] ?? []) {
      granted.add(permission);
    }
  }
  return granted;
}

export function can(roles: readonly Role[], permission: Permission): boolean {
  return permissionsForRoles(roles).has(permission);
}

/**
 * Organisation-scoped permissions additionally require membership of the
 * organisation being acted on. Super admins are the only exception.
 */
export function canForOrganisation(
  roles: readonly Role[],
  permission: Permission,
  administeredOrgIds: readonly string[],
  targetOrgId: string,
): boolean {
  if (roles.includes('super_admin')) {
    return true;
  }
  return can(roles, permission) && administeredOrgIds.includes(targetOrgId);
}
