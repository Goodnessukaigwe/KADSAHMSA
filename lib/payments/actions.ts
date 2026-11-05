"use server";

import { revalidatePath } from "next/cache";

import { fulfilPayment, startCheckoutFor, type CheckoutResult } from "@/lib/payments/checkout";
import { requireStaff, requireUser } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

/** Starts Paystack checkout for the signed-in learner. Returns the page to send them to. */
export async function startCheckout(slug: string): Promise<CheckoutResult> {
  const user = await requireUser();
  if (!user.email) return { ok: false, error: "Your account needs an email address to pay." };
  return startCheckoutFor({ id: user.id, email: user.email }, slug);
}

export type PricingResult = { ok: true } | { ok: false; error: string };

/** Staff only: set a course's price in naira. Learners who enrol themselves pay this. */
export async function setCoursePricing(slug: string, priceNaira: number): Promise<PricingResult> {
  await requireStaff();
  if (!Number.isFinite(priceNaira) || priceNaira < 0 || priceNaira > 10_000_000) {
    return { ok: false, error: "Enter a price between 0 and 10,000,000 naira." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("courses")
    .update({ price_kobo: Math.round(priceNaira * 100) })
    .eq("slug", slug);
  if (error) return { ok: false, error: "Could not save. Has the payments update been applied?" };
  revalidatePath(`/courses/${slug}`);
  revalidatePath(`/admin/courses/${slug}/analytics`);
  return { ok: true };
}

/** Staff only: ask Paystack again about a payment that is still pending, and enrol if it went through. */
export async function recheckPayment(
  reference: string
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  await requireStaff();
  const result = await fulfilPayment(reference);
  revalidatePath("/admin/payments");
  if (result.ok) return { ok: true, message: "Paid. The learner is enrolled." };
  return { ok: false, error: result.error };
}
