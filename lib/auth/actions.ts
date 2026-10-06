"use server";

import { cookies, headers } from "next/headers";

import { findUserIdByEmail } from "@/lib/auth/admin-users";
import { emailConfigured, sendEmail } from "@/lib/email/send";
import { passwordResetEmail, verificationEmail } from "@/lib/email/templates";
import { requireUser } from "@/lib/permissions";
import { PRIVACY_POLICY_KEY, PRIVACY_POLICY_VERSION } from "@/lib/privacy";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** `verify` is true when the account still has to be confirmed from an email we sent. */
export type RegisterResult = { ok: true; verify?: boolean } | { ok: false; error: string };
export type ResendVerificationResult = { ok: true } | { ok: false; error: string };
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

type AdminClient = ReturnType<typeof createAdminClient>;

const RESEND_COOLDOWN_COOKIE = "kadsamhsa.verify-cooldown";
const RESEND_COOLDOWN_SECONDS = 60;
const STAFF_ROLES = ["super_admin", "content_admin", "org_admin"];

function confirmLink(origin: string, tokenHash: string, type: "signup" | "magiclink" | "recovery") {
  const next = type === "recovery" ? "/reset-password" : "/my";
  return `${origin}/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${type}&next=${encodeURIComponent(next)}`;
}

/** Records privacy consent. Returns an error message, or null when saved. */
async function recordConsent(admin: AdminClient, userId: string): Promise<string | null> {
  const { error } = await admin.from("consents").insert({
    user_id: userId,
    policy_key: PRIVACY_POLICY_KEY,
    policy_version: PRIVACY_POLICY_VERSION,
  });
  if (!error || /duplicate|unique/i.test(error.message)) return null;
  if (/consents|schema cache|does not exist/i.test(error.message)) {
    return "Consent storage is not ready. Apply supabase/apply-phase7.sql, then try again.";
  }
  return error.message || "Could not record consent. Account was not created.";
}

/** Sends a fresh confirmation link to an account that exists but is not confirmed yet. */
async function sendVerificationFor(
  admin: AdminClient,
  email: string,
  origin: string
): Promise<"sent" | "none" | "failed"> {
  const userId = await findUserIdByEmail(admin, email);
  if (!userId) return "none";
  const { data: found } = await admin.auth.admin.getUserById(userId);
  const user = found?.user;
  if (!user || user.email_confirmed_at) return "none";

  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return "failed";

  const meta = (user.user_metadata ?? {}) as { full_name?: string };
  const mail = verificationEmail({
    name: meta.full_name ?? "",
    url: confirmLink(origin, tokenHash, "magiclink"),
  });
  const sent = await sendEmail({ to: email, ...mail });
  return sent.ok ? "sent" : "failed";
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
    const verifyByEmail = emailConfigured();
    const origin = await appOrigin();
    let userId: string | undefined;
    let tokenHash: string | undefined;

    if (verifyByEmail) {
      // The account is created unconfirmed; the email link confirms it and signs the person in.
      const { data, error } = await admin.auth.admin.generateLink({
        type: "signup",
        email: normalizedEmail,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) {
        if (/already|registered|exists/i.test(error.message)) {
          // A sign-up that was never confirmed gets a fresh link instead of a dead end.
          if ((await sendVerificationFor(admin, normalizedEmail, origin)) === "sent") {
            return { ok: true, verify: true };
          }
          return { ok: false, error: "That email already has an account. Log in instead." };
        }
        return { ok: false, error: error.message };
      }
      userId = data.user?.id;
      tokenHash = data.properties?.hashed_token;
    } else {
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
      userId = data.user?.id;
    }

    if (!userId) {
      return { ok: false, error: "Could not create your account. Try again." };
    }

    const consentError = await recordConsent(admin, userId);
    if (consentError) {
      await admin.auth.admin.deleteUser(userId);
      return { ok: false, error: consentError };
    }

    if (verifyByEmail) {
      const mail = verificationEmail({
        name: fullName,
        url: confirmLink(origin, tokenHash ?? "", "signup"),
      });
      const sent = tokenHash ? await sendEmail({ to: normalizedEmail, ...mail }) : null;
      if (!sent?.ok) {
        // Do not leave an account nobody can confirm; the person can simply try again.
        await admin.auth.admin.deleteUser(userId);
        return {
          ok: false,
          error: "We could not send the confirmation email. Please try again in a few minutes.",
        };
      }
      return { ok: true, verify: true };
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

/** "Resend the confirmation email". Never reveals whether an account exists. */
export async function resendVerification(email: string): Promise<ResendVerificationResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@") || !emailConfigured()) return { ok: true };

  const store = await cookies();
  if (store.get(RESEND_COOLDOWN_COOKIE)) return { ok: true };

  try {
    const admin = createAdminClient();
    await sendVerificationFor(admin, normalizedEmail, await appOrigin());
    store.set(RESEND_COOLDOWN_COOKIE, String(Date.now()), {
      maxAge: RESEND_COOLDOWN_SECONDS,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  } catch {
    // The page says the same thing either way.
  }
  return { ok: true };
}

/**
 * Lets an unconfirmed account sign in. While public sign-up does not verify email
 * (no email provider) this covers everyone. Once email verification is on it only
 * covers accounts staff created and gave an admin role, so a self-registered learner
 * must confirm from the email we sent.
 */
export async function confirmPendingEmail(email: string): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) return;

  try {
    const admin = createAdminClient();
    const userId = await findUserIdByEmail(admin, normalizedEmail);
    if (!userId) return;
    if (emailConfigured()) {
      const { data: roles } = await admin.from("user_roles").select("role_id").eq("user_id", userId);
      if (!(roles ?? []).some((row) => STAFF_ROLES.includes(row.role_id))) return;
    }
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
    if (emailConfigured()) {
      // Branded reset email through Resend; always answer the same way.
      const admin = createAdminClient();
      const origin = await appOrigin();
      const userId = await findUserIdByEmail(admin, normalizedEmail);
      if (userId) {
        const { data: found } = await admin.auth.admin.getUserById(userId);
        const { data } = await admin.auth.admin.generateLink({ type: "recovery", email: normalizedEmail });
        const tokenHash = data?.properties?.hashed_token;
        if (tokenHash) {
          const meta = (found?.user?.user_metadata ?? {}) as { full_name?: string };
          const mail = passwordResetEmail({
            name: meta.full_name ?? "",
            url: confirmLink(origin, tokenHash, "recovery"),
          });
          await sendEmail({ to: normalizedEmail, ...mail });
        }
      }
      return { ok: true };
    }

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
