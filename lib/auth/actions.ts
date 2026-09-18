"use server";

import { headers } from "next/headers";

import { findUserIdByEmail } from "@/lib/auth/admin-users";
import { requireUser } from "@/lib/permissions";
import { PRIVACY_POLICY_KEY, PRIVACY_POLICY_VERSION } from "@/lib/privacy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type RegisterResult = { ok: true } | { ok: false; error: string };
export type UpdatePasswordResult = { ok: true } | { ok: false; error: string };
export type RequestPasswordResetResult = { ok: true } | { ok: false; error: string };

async function appOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) {
    return "http://localhost:3000";
  }
  const proto =
    headerList.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

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

    if (consentError && !/duplicate|unique/i.test(consentError.message)) {
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

    const supabase = await createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signInError) {
      return {
        ok: false,
        error: "Account created. Log in to continue.",
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

/** Lets leftover unconfirmed accounts sign in now that public signup no longer verifies email. */
export async function confirmPendingEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) return;

  try {
    const admin = createAdminClient();
    const userId = await findUserIdByEmail(admin, normalizedEmail);
    if (!userId) return;
    await admin.auth.admin.updateUserById(userId, { email_confirm: true });
  } catch {
    // Sign-in still reports the original error if this cannot run.
  }
}

export async function requestPasswordReset(email: string): Promise<RequestPasswordResetResult> {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail.includes("@") || normalizedEmail.length < 6) {
    return { ok: false, error: "Enter a valid email address." };
  }

  try {
    const supabase = await createClient();
    const origin = await appOrigin();
    await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${origin}/auth/confirm?next=/reset-password`,
    });
    return { ok: true };
  } catch (cause) {
    if (cause instanceof Error && /Missing NEXT_PUBLIC_SUPABASE/.test(cause.message)) {
      return { ok: false, error: "Authentication is not configured. Add Supabase keys to .env.local." };
    }
    return { ok: true };
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
