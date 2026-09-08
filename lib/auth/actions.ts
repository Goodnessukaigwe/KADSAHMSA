"use server";

import { requireUser } from "@/lib/permissions";
import { PRIVACY_POLICY_KEY, PRIVACY_POLICY_VERSION } from "@/lib/privacy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RegisterResult = { ok: true } | { ok: false; error: string };
export type UpdatePasswordResult = { ok: true } | { ok: false; error: string };

export async function registerAccount(
  name: string,
  email: string,
  password: string,
  acceptedPrivacy: boolean
): Promise<RegisterResult> {
  const fullName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!acceptedPrivacy) {
    return {
      ok: false,
      error: "Accept the privacy notice to create an account. The box must be ticked by you.",
    };
  }

  if (fullName.length < 2 || !normalizedEmail.includes("@") || password.length < 8) {
    return { ok: false, error: "Enter your name, a valid email, and a password of at least 8 characters." };
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) {
      if (/already|registered|exists/i.test(error.message)) {
        return { ok: false, error: "That email already has an account. Log in instead." };
      }
      return { ok: false, error: error.message };
    }

    const userId = data.user?.id;
    if (!userId) {
      return { ok: false, error: "Could not create your account. Try again." };
    }

    const { error: consentError } = await admin.from("consents").insert({
      user_id: userId,
      policy_key: PRIVACY_POLICY_KEY,
      policy_version: PRIVACY_POLICY_VERSION,
    });

    if (consentError) {
      await admin.auth.admin.deleteUser(userId);
      if (/consents|schema cache|does not exist/i.test(consentError.message)) {
        return {
          ok: false,
          error: "Consent storage is not ready. Apply supabase/apply-phase7.sql, then try again.",
        };
      }
      return {
        ok: false,
        error: consentError.message || "Could not record consent. Account was not created.",
      };
    }

    return { ok: true };
  } catch (cause) {
    if (cause instanceof Error && /Missing NEXT_PUBLIC_SUPABASE|SUPABASE_SERVICE_ROLE/.test(cause.message)) {
      return { ok: false, error: "Authentication is not configured. Add Supabase keys to .env.local." };
    }
    return { ok: false, error: "Could not create your account. Try again." };
  }
}

export async function updatePassword(
  password: string
): Promise<UpdatePasswordResult> {
  if (password.length < 8) {
    return { ok: false, error: "Enter a password of at least 8 characters." };
  }

  await requireUser();

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (cause) {
    if (cause instanceof Error && /Missing NEXT_PUBLIC_SUPABASE/.test(cause.message)) {
      return { ok: false, error: "Authentication is not configured. Add Supabase keys to .env.local." };
    }
    return { ok: false, error: "Could not save your new password. Try again." };
  }
}
