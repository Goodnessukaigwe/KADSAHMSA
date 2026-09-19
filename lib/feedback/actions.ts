"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { FEEDBACK_CATEGORIES, feedbackCopy } from "@/lib/content/feedback";
import type {
  FeedbackCategory,
  SubmitFeedbackInput,
} from "@/lib/feedback/types";
import { getSessionProfile, requireStaff } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type FeedbackActionResult = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f-]{36}$/i;
const COOLDOWN_MS = 60_000;
const ANON_COOKIE = "kadsamhsa.feedback-cooldown";
const APPLY = feedbackCopy.applySchema;

function fail(error: string): FeedbackActionResult {
  return { ok: false, error };
}

function schemaError(message: string | undefined) {
  if (
    message &&
    (message.includes("feedback_tickets") || message.includes("schema cache"))
  ) {
    return APPLY;
  }
  return feedbackCopy.genericError;
}

function isCategory(value: string): value is FeedbackCategory {
  return (FEEDBACK_CATEGORIES as readonly string[]).includes(value);
}

function sanitizePagePath(raw: string) {
  const trimmed = raw.trim();
  const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, "");
  const path = withoutOrigin.split(/[?#]/)[0] || "/";
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return withSlash.slice(0, 200) || "/";
}

function revalidateInbox() {
  revalidatePath("/admin/feedback");
  revalidatePath("/admin", "layout");
}

async function recentSignedInTicket(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("feedback_tickets")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.created_at) return false;
  return Date.now() - new Date(data.created_at).getTime() < COOLDOWN_MS;
}

async function anonymousCoolingDown() {
  const store = await cookies();
  const raw = store.get(ANON_COOKIE)?.value;
  if (!raw) return false;
  const at = Number(raw);
  return Number.isFinite(at) && Date.now() - at < COOLDOWN_MS;
}

async function stampAnonymousCooldown() {
  const store = await cookies();
  store.set(ANON_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60,
  });
}

export async function submitFeedback(
  input: SubmitFeedbackInput
): Promise<FeedbackActionResult> {
  if (input.website?.trim()) {
    return { ok: true };
  }

  const message = input.message.trim();
  if (message.length < 20) return fail(feedbackCopy.tooShort);
  if (message.length > 2000) return fail(feedbackCopy.tooLong);
  if (!isCategory(input.category)) return fail(feedbackCopy.pickCategory);

  const profile = await getSessionProfile();
  if (profile) {
    if (await recentSignedInTicket(profile.id)) {
      return fail(feedbackCopy.cooldown);
    }
  } else if (await anonymousCoolingDown()) {
    return fail(feedbackCopy.cooldown);
  }

  const admin = createAdminClient();
  const { error } = await admin.from("feedback_tickets").insert({
    user_id: profile?.id ?? null,
    submitter_name: profile?.name.trim() || feedbackCopy.anonymous,
    submitter_email: profile?.email.trim() ?? "",
    is_anonymous: !profile,
    category: input.category,
    message,
    page_path: sanitizePagePath(input.pagePath),
    status: "open",
  });

  if (error) return fail(schemaError(error.message));
  if (!profile) await stampAnonymousCooldown();
  revalidateInbox();
  return { ok: true };
}

export async function markFeedbackRead(id: string): Promise<FeedbackActionResult> {
  await requireStaff();
  if (!UUID.test(id)) return fail("That ticket was not found.");

  const admin = createAdminClient();
  const { data, error: loadError } = await admin
    .from("feedback_tickets")
    .select("read_at")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return fail(schemaError(loadError.message));
  if (!data) return fail("That ticket was not found.");
  if (data.read_at) return { ok: true };

  const { error } = await admin
    .from("feedback_tickets")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail(schemaError(error.message));
  revalidateInbox();
  return { ok: true };
}

export async function markFeedbackResolved(
  id: string
): Promise<FeedbackActionResult> {
  await requireStaff();
  if (!UUID.test(id)) return fail("That ticket was not found.");

  const now = new Date().toISOString();
  const admin = createAdminClient();
  const { data, error: loadError } = await admin
    .from("feedback_tickets")
    .select("read_at")
    .eq("id", id)
    .maybeSingle();
  if (loadError) return fail(schemaError(loadError.message));
  if (!data) return fail("That ticket was not found.");

  const { error } = await admin
    .from("feedback_tickets")
    .update({
      status: "resolved",
      resolved_at: now,
      read_at: data.read_at ?? now,
    })
    .eq("id", id);
  if (error) return fail(schemaError(error.message));
  revalidateInbox();
  return { ok: true };
}
