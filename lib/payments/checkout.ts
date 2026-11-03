import "server-only";

import { revalidatePath } from "next/cache";

import { enrolLearnerWithAdmin } from "@/lib/courses/enrol";
import { siteUrl } from "@/lib/email/send";
import {
  initializeTransaction,
  newPaymentReference,
  paystackConfigured,
  verifyTransaction,
} from "@/lib/payments/paystack";
import { createAdminClient } from "@/lib/supabase/admin";

export type SeatTerms = {
  courseId: string;
  slug: string;
  title: string;
  priceKobo: number;
};

/** A course's price. Self-enrolment on a priced course goes through checkout. */
export async function getSeatTerms(slug: string): Promise<SeatTerms | null> {
  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, slug, title, price_kobo")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) return null;
  return {
    courseId: course.id,
    slug: course.slug,
    title: course.title,
    priceKobo: course.price_kobo ?? 0,
  };
}

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

/** Creates a pending payment and a Paystack checkout for the learner. */
export async function startCheckoutFor(
  user: { id: string; email: string },
  slug: string
): Promise<CheckoutResult> {
  if (!paystackConfigured()) {
    return { ok: false, error: "Online payment is not switched on yet. Please check back soon." };
  }
  const terms = await getSeatTerms(slug);
  if (!terms) return { ok: false, error: "That course was not found." };
  if (terms.priceKobo <= 0) {
    return { ok: false, error: "This course does not have a price yet." };
  }

  const admin = createAdminClient();
  const reference = newPaymentReference();
  const { error: insertError } = await admin.from("payments").insert({
    user_id: user.id,
    course_id: terms.courseId,
    reference,
    amount_kobo: terms.priceKobo,
  });
  if (insertError) return { ok: false, error: "Could not start the payment. Please try again." };

  try {
    const session = await initializeTransaction({
      email: user.email,
      amountKobo: terms.priceKobo,
      reference,
      callbackUrl: `${siteUrl()}/dashboard/payments/callback`,
      customFields: [
        { display_name: "Project", variable_name: "project", value: "KADSAMHSA LMS" },
        { display_name: "Payment for", variable_name: "payment_for", value: "Administrative fee (not the cost of the programme)" },
        { display_name: "Course", variable_name: "course", value: terms.title },
        { display_name: "Learner ID", variable_name: "learner_id", value: user.id },
      ],
    });
    return { ok: true, url: session.authorization_url };
  } catch (cause) {
    console.error("startCheckout", cause);
    await admin.from("payments").update({ status: "failed" }).eq("reference", reference);
    return { ok: false, error: "Could not reach the payment provider. Please try again." };
  }
}

export type FulfilResult =
  | { ok: true; courseSlug: string }
  | { ok: false; error: string; pending?: boolean };

/**
 * Confirms a payment with Paystack and enrols the learner. Safe to call more than once
 * (the webhook and the return page both call it).
 */
export async function fulfilPayment(reference: string): Promise<FulfilResult> {
  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payments")
    .select("id, user_id, course_id, amount_kobo, currency, status")
    .eq("reference", reference)
    .maybeSingle();
  if (!payment) return { ok: false, error: "We could not find that payment." };

  const { data: course } = await admin
    .from("courses")
    .select("slug")
    .eq("id", payment.course_id)
    .maybeSingle();
  if (!course) return { ok: false, error: "The course for this payment was not found." };

  if (payment.status !== "success") {
    let verified;
    try {
      verified = await verifyTransaction(reference);
    } catch (cause) {
      console.error("fulfilPayment verify", cause);
      return { ok: false, error: "We could not confirm the payment yet.", pending: true };
    }
    if (verified.status !== "success") {
      const failed = verified.status === "failed" || verified.status === "abandoned";
      if (failed) await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
      return {
        ok: false,
        error: failed ? "The payment was not completed." : "The payment is still processing.",
        pending: !failed,
      };
    }
    if (verified.amount !== payment.amount_kobo || verified.currency !== payment.currency) {
      console.error("fulfilPayment amount mismatch", reference);
      return { ok: false, error: "The amount paid does not match the course price." };
    }
    await admin
      .from("payments")
      .update({
        status: "success",
        paystack_transaction_id: String(verified.id),
        paid_at: verified.paid_at ?? new Date().toISOString(),
        channel: verified.channel ?? null,
        fees_kobo: typeof verified.fees === "number" ? verified.fees : null,
      })
      .eq("id", payment.id);
  }

  const enrolled = await enrolLearnerWithAdmin(payment.user_id, course.slug);
  if (!enrolled.ok) {
    return { ok: false, error: enrolled.error };
  }
  revalidatePath("/dashboard/payments");
  return { ok: true, courseSlug: course.slug };
}

/**
 * Re-checks this learner's recent pending payments with Paystack. This is what enrols someone who
 * paid but closed the tab before returning, so the LMS does not depend on a webhook.
 */
export async function reconcilePendingPayments(userId: string) {
  if (!paystackConfigured()) return;
  const admin = createAdminClient();
  const since = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: pending } = await admin
    .from("payments")
    .select("reference")
    .eq("user_id", userId)
    .eq("status", "pending")
    .gte("created_at", since)
    .limit(5);
  for (const row of pending ?? []) {
    await fulfilPayment(row.reference);
  }
}
