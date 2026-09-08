"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";

import { findUserIdByEmail } from "@/lib/auth/admin-users";
import { enrolLearnerWithAdmin } from "@/lib/courses/enrol";
import { CSV_ROW_CAP, type CsvMemberRow } from "@/lib/org/csv";
import {
  hasRole,
  requireOrgAdmin,
  requireStaff,
  requireUser,
} from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type InviteResult =
  | { ok: true; code: string }
  | { ok: false; error: string };
export type BulkResult =
  | {
      ok: true;
      created: number;
      joined: number;
      enrolled: number;
      skipped: number;
      errors: string[];
    }
  | { ok: false; error: string };

const UUID = /^[0-9a-f-]{36}$/i;
const APPLY = "Apply supabase/apply-phase5.sql in the Supabase SQL editor.";

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function seatOrSchemaError(message: string | undefined) {
  if (!message) return "Could not complete that change.";
  if (/no seats left/i.test(message)) return "No seats left for this organisation.";
  if (
    message.includes("organisations") ||
    message.includes("organisation_memberships") ||
    message.includes("schema cache")
  ) {
    return APPLY;
  }
  return message;
}

function revalidateOrg(organisationId: string, userId?: string) {
  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${organisationId}`);
  revalidatePath("/admin/users");
  revalidatePath("/admin/reports");
  revalidatePath("/org");
  if (userId) revalidatePath(`/admin/users/${userId}`);
}

async function syncOrgAdminRole(userId: string) {
  const admin = createAdminClient();
  const { count } = await admin
    .from("organisation_memberships")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("role", "admin");
  if ((count ?? 0) > 0) {
    const { error } = await admin.from("user_roles").insert({
      user_id: userId,
      role_id: "org_admin",
    });
    if (error && error.code !== "23505") {
      return error.message;
    }
    return null;
  }
  const { error } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role_id", "org_admin");
  if (error) return error.message;
  return null;
}

export async function createOrganisation(formData: FormData): Promise<ActionResult> {
  await requireStaff();
  const name = String(formData.get("name") ?? "").trim();
  const seatLimit = Number(formData.get("seatLimit") ?? 10);
  const approved = String(formData.get("approved") ?? "") === "on";
  if (name.length < 2) return fail("Enter an organisation name.");
  if (!Number.isInteger(seatLimit) || seatLimit < 0) {
    return fail("Seat limit must be zero or a positive whole number.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("organisations").insert({
    name,
    seat_limit: seatLimit,
    status: approved ? "approved" : "pending",
  });
  if (error) return fail(seatOrSchemaError(error.message));
  revalidateOrg("");
  return { ok: true };
}

export async function setOrganisationStatus(
  organisationId: string,
  status: "pending" | "approved" | "rejected"
): Promise<ActionResult> {
  await requireStaff();
  if (!UUID.test(organisationId)) return fail("That organisation was not found.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("organisations")
    .update({ status })
    .eq("id", organisationId);
  if (error) return fail(seatOrSchemaError(error.message));
  revalidateOrg(organisationId);
  return { ok: true };
}

export async function setSeatLimit(
  organisationId: string,
  seatLimit: number
): Promise<ActionResult> {
  await requireStaff();
  if (!UUID.test(organisationId)) return fail("That organisation was not found.");
  if (!Number.isInteger(seatLimit) || seatLimit < 0) {
    return fail("Seat limit must be zero or a positive whole number.");
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("organisations")
    .update({ seat_limit: seatLimit })
    .eq("id", organisationId);
  if (error) return fail(seatOrSchemaError(error.message));
  revalidateOrg(organisationId);
  return { ok: true };
}

export async function addMemberByEmail(
  organisationId: string,
  email: string,
  asAdmin = false
): Promise<ActionResult> {
  await requireOrgAdmin(organisationId);
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return fail("Enter a valid email address.");

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return fail("Authentication is not configured.");
  }
  const userId = await findUserIdByEmail(admin, trimmed);
  if (!userId) return fail("No account uses that email.");
  return addMembership(organisationId, userId, asAdmin ? "admin" : "member");
}

export async function assignLearnerToOrg(
  userId: string,
  organisationId: string
): Promise<ActionResult> {
  await requireStaff();
  if (!UUID.test(userId) || !UUID.test(organisationId)) {
    return fail("That learner or organisation was not found.");
  }
  return addMembership(organisationId, userId, "member");
}

async function addMembership(
  organisationId: string,
  userId: string,
  role: "member" | "admin"
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("organisation_memberships").insert({
    organisation_id: organisationId,
    user_id: userId,
    role,
  });
  if (error) {
    if (error.code === "23505") {
      return fail("That learner is already a member of this organisation.");
    }
    return fail(seatOrSchemaError(error.message));
  }
  if (role === "admin") {
    const roleError = await syncOrgAdminRole(userId);
    if (roleError) return fail(roleError);
  }
  revalidateOrg(organisationId, userId);
  return { ok: true };
}

export async function setMemberRole(
  organisationId: string,
  userId: string,
  role: "member" | "admin"
): Promise<ActionResult> {
  const { user, roles } = await requireOrgAdmin(organisationId);
  if (!UUID.test(userId)) return fail("That learner was not found.");
  if (userId === user.id && role === "member" && !isStaffRoles(roles)) {
    return fail("You cannot demote yourself. Ask KADSAMHSA staff.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organisation_memberships")
    .update({ role })
    .eq("organisation_id", organisationId)
    .eq("user_id", userId);
  if (error) return fail(seatOrSchemaError(error.message));

  const roleError = await syncOrgAdminRole(userId);
  if (roleError) return fail(roleError);
  revalidateOrg(organisationId, userId);
  return { ok: true };
}

export async function removeMember(
  organisationId: string,
  userId: string
): Promise<ActionResult> {
  const { user, roles } = await requireOrgAdmin(organisationId);
  if (!UUID.test(userId)) return fail("That learner was not found.");
  if (userId === user.id && !isStaffRoles(roles)) {
    return fail("You cannot remove yourself. Ask KADSAMHSA staff.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("organisation_memberships")
    .delete()
    .eq("organisation_id", organisationId)
    .eq("user_id", userId);
  if (error) return fail(seatOrSchemaError(error.message));

  const roleError = await syncOrgAdminRole(userId);
  if (roleError) return fail(roleError);
  revalidateOrg(organisationId, userId);
  return { ok: true };
}

function isStaffRoles(roles: string[]) {
  return roles.some((role) => role === "content_admin" || role === "super_admin");
}

export async function createInvite(
  organisationId: string,
  courseId: string,
  maxUses: number | null
): Promise<InviteResult> {
  const { user } = await requireOrgAdmin(organisationId);
  const supabase = await createClient();
  const { data: org } = await supabase
    .from("organisations")
    .select("status")
    .eq("id", organisationId)
    .maybeSingle();
  if (!org) return { ok: false, error: "That organisation was not found." };
  if (org.status !== "approved") {
    return { ok: false, error: "Approve this organisation before creating invites." };
  }

  let resolvedCourse: string | null = null;
  if (courseId) {
    const { data: course } = await supabase
      .from("courses")
      .select("id, status")
      .eq("id", courseId)
      .maybeSingle();
    if (!course || course.status !== "published") {
      return { ok: false, error: "Choose a published course, or none." };
    }
    resolvedCourse = course.id;
  }

  const code = `KAD-ORG-${randomBytes(8).toString("hex").toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from("organisation_invites").insert({
    organisation_id: organisationId,
    code,
    course_id: resolvedCourse,
    created_by: user.id,
    max_uses: maxUses && maxUses > 0 ? maxUses : null,
    expires_at: expiresAt,
  });
  if (error) return { ok: false, error: seatOrSchemaError(error.message) };
  revalidateOrg(organisationId);
  return { ok: true, code };
}

export async function bulkImportMembers(
  organisationId: string,
  courseSlug: string,
  rows: CsvMemberRow[]
): Promise<BulkResult> {
  await requireOrgAdmin(organisationId);
  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, error: "Upload a CSV with email and full_name columns." };
  }
  if (rows.length > CSV_ROW_CAP) {
    return {
      ok: false,
      error: `CSV is limited to ${CSV_ROW_CAP} rows. Split the file and try again.`,
    };
  }
  const slug = courseSlug.trim();
  if (!slug) return { ok: false, error: "Choose a published course for enrolment." };

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { ok: false, error: "Authentication is not configured." };
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!course || course.status !== "published") {
    return { ok: false, error: "Choose a published course for enrolment." };
  }

  let created = 0;
  let joined = 0;
  let enrolled = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    const fullName = row.full_name.trim();
    if (!email.includes("@")) {
      errors.push(`${email || "row"}: not a valid email.`);
      continue;
    }

    let userId = await findUserIdByEmail(admin, email);
    if (!userId) {
      const password = randomBytes(18).toString("base64url");
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error || !data.user) {
        if (error && /already|registered|exists/i.test(error.message)) {
          userId = await findUserIdByEmail(admin, email);
        }
        if (!userId) {
          errors.push(`${email}: ${error?.message || "could not create account."}`);
          continue;
        }
      } else {
        userId = data.user.id;
        created += 1;
      }
      if (fullName) {
        await admin.from("profiles").update({ full_name: fullName }).eq("id", userId);
      }
    }

    const { data: existing } = await supabase
      .from("organisation_memberships")
      .select("id")
      .eq("organisation_id", organisationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!existing) {
      const { error: memberError } = await supabase.from("organisation_memberships").insert({
        organisation_id: organisationId,
        user_id: userId,
        role: "member",
      });
      if (memberError) {
        const message = seatOrSchemaError(memberError.message);
        errors.push(`${email}: ${message}`);
        if (/no seats left/i.test(message)) {
          errors.push("Stopped: no seats left for this organisation.");
          break;
        }
        continue;
      }
      joined += 1;
    } else {
      skipped += 1;
    }

    const enrol = await enrolLearnerWithAdmin(userId, course.slug);
    if (!enrol.ok) {
      errors.push(`${email}: ${enrol.error}`);
    } else {
      enrolled += 1;
    }
  }

  revalidateOrg(organisationId);
  return { ok: true, created, joined, enrolled, skipped, errors };
}

export async function redeemInvite(code: string): Promise<ActionResult> {
  const user = await requireUser();
  const normalized = code.trim().toUpperCase();
  if (!normalized.startsWith("KAD-ORG-")) {
    return fail("That invite code is not valid.");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return fail("Authentication is not configured.");
  }

  const { data: invite } = await admin
    .from("organisation_invites")
    .select("id, organisation_id, course_id, uses, max_uses, expires_at")
    .eq("code", normalized)
    .maybeSingle();
  if (!invite) return fail("That invite code is not valid.");

  const { data: org } = await admin
    .from("organisations")
    .select("id, status")
    .eq("id", invite.organisation_id)
    .maybeSingle();
  if (!org || org.status !== "approved") {
    return fail("This organisation is not approved yet.");
  }

  const { data: existing } = await admin
    .from("organisation_memberships")
    .select("id")
    .eq("organisation_id", invite.organisation_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return fail("That invite has expired.");
    }
    if (invite.max_uses != null && invite.uses >= invite.max_uses) {
      return fail("That invite has no uses left.");
    }

    const { error: memberError } = await admin.from("organisation_memberships").insert({
      organisation_id: invite.organisation_id,
      user_id: user.id,
      role: "member",
    });
    if (memberError && memberError.code !== "23505") {
      return fail(seatOrSchemaError(memberError.message));
    }
    if (!memberError) {
      const { error: useError } = await admin
        .from("organisation_invites")
        .update({ uses: invite.uses + 1 })
        .eq("id", invite.id)
        .eq("uses", invite.uses);
      if (useError) return fail(useError.message);
    }
  }

  if (invite.course_id) {
    const { data: course } = await admin
      .from("courses")
      .select("slug")
      .eq("id", invite.course_id)
      .maybeSingle();
    if (course?.slug) {
      const enrol = await enrolLearnerWithAdmin(user.id, course.slug);
      if (!enrol.ok) return enrol;
    }
  }

  revalidateOrg(invite.organisation_id, user.id);
  revalidatePath("/my");
  revalidatePath("/my/courses");
  return { ok: true };
}

export async function setLearnerStaffRoles(
  userId: string,
  next: { contentAdmin: boolean; superAdmin: boolean }
): Promise<ActionResult> {
  const { user, roles } = await requireStaff();
  if (!hasRole(roles, "super_admin")) {
    return fail("Only a super admin can change staff roles.");
  }
  if (!UUID.test(userId)) return fail("That learner was not found.");
  if (userId === user.id && !next.superAdmin) {
    return fail("You cannot remove your own super admin role.");
  }

  const admin = createAdminClient();
  const { data: current } = await admin
    .from("user_roles")
    .select("role_id")
    .eq("user_id", userId);
  const have = new Set((current ?? []).map((row) => row.role_id));

  async function setRole(roleId: "content_admin" | "super_admin", enabled: boolean) {
    if (enabled && !have.has(roleId)) {
      const { error } = await admin.from("user_roles").insert({
        user_id: userId,
        role_id: roleId,
      });
      if (error && error.code !== "23505") return error.message;
    }
    if (!enabled && have.has(roleId)) {
      const { error } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role_id", roleId);
      if (error) return error.message;
    }
    return null;
  }

  const contentError = await setRole("content_admin", next.contentAdmin);
  if (contentError) return fail(contentError);
  const superError = await setRole("super_admin", next.superAdmin);
  if (superError) return fail(superError);

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}
