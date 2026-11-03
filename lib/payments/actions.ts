"use server";

import { revalidatePath } from "next/cache";

import { startCheckoutFor, type CheckoutResult } from "@/lib/payments/checkout";
import { requireStaff, requireUser } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

/** Starts Paystack checkout for the signed-in learner. Returns the page to send them to. */
export async function startCheckout(slug: string): Promise<CheckoutResult> {
  const user = await requireUser();
  if (!user.email) return { ok: false, error: "Your account needs an email address to pay." };
  return startCheckoutFor({ id: user.id, email: user.email }, slug);
}

export type PricingResult = { ok: true } | { ok: false; error: string };

/** Staff only: set a course's price (in naira) and how many learners enrol free first. */
export async function setCoursePricing(
  slug: string,
  priceNaira: number,
  freeSeatLimit: number | null
): Promise<PricingResult> {
  await requireStaff();
  if (!Number.isFinite(priceNaira) || priceNaira < 0 || priceNaira > 10_000_000) {
    return { ok: false, error: "Enter a price between 0 and 10,000,000 naira." };
  }
  if (freeSeatLimit !== null && (!Number.isInteger(freeSeatLimit) || freeSeatLimit < 0)) {
    return { ok: false, error: "The free places must be a whole number, or empty for no limit." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("courses")
    .update({ price_kobo: Math.round(priceNaira * 100), free_seat_limit: freeSeatLimit })
    .eq("slug", slug);
  if (error) return { ok: false, error: "Could not save. Has the payments update been applied?" };
  revalidatePath(`/courses/${slug}`);
  revalidatePath(`/admin/courses/${slug}/analytics`);
  return { ok: true };
}
