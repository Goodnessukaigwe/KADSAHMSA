"use server";

import { revalidatePath } from "next/cache";

import { getUserRoles, isStaff, requireRole } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type RemoveUserResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * Permanently removes a learner's account and everything attached to it (enrolments, progress,
 * quiz attempts and certificates). Super admins only, never themselves or another staff member,
 * and the account's email must be typed to confirm.
 */
export async function removeUserAccount(
  userId: string,
  confirmEmail: string
): Promise<RemoveUserResult> {
  const { user } = await requireRole("super_admin");
  if (!UUID.test(userId)) return { ok: false, error: "That account was not found." };
  if (userId === user.id) return { ok: false, error: "You cannot remove your own account." };

  const targetRoles = await getUserRoles(userId);
  if (isStaff(targetRoles) || targetRoles.includes("org_admin")) {
    return {
      ok: false,
      error: "This person has an admin role. Remove their roles on their profile first.",
    };
  }

  const admin = createAdminClient();
  const { data, error: lookupError } = await admin.auth.admin.getUserById(userId);
  if (lookupError || !data?.user) return { ok: false, error: "That account was not found." };
  const email = data.user.email ?? "";
  if (!email || confirmEmail.trim().toLowerCase() !== email.toLowerCase()) {
    return { ok: false, error: "The email you typed does not match this account." };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) {
    console.error("removeUserAccount", error.message);
    return {
      ok: false,
      error: "Could not remove this account. It may still own invitations or certificate revocations.",
    };
  }

  // The chat history stays, without the link to the removed account.
  await admin.from("help_chats").update({ user_id: null }).eq("user_id", userId);

  revalidatePath("/admin/users");
  revalidatePath("/admin/inbox");
  revalidatePath("/admin");
  return { ok: true };
}
