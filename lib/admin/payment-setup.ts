import "server-only";

import { emailConfigured, siteUrl } from "@/lib/email/send";
import { keyMode, pingPaystack } from "@/lib/payments/paystack";
import { requireStaff } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type SetupCheck = { label: string; ok: boolean; detail: string };

/** Everything that has to be in place for payments to work, with no secret ever shown. */
export async function getPaymentSetup(): Promise<SetupCheck[]> {
  await requireStaff();
  const checks: SetupCheck[] = [];

  const mode = keyMode();
  checks.push({
    label: "Paystack secret key",
    ok: mode === "test" || mode === "live",
    detail:
      mode === "missing"
        ? "Not set. Add PAYSTACK_SECRET_KEY in Vercel (Production) and redeploy."
        : mode === "unknown"
          ? "Set, but it does not start with sk_test_ or sk_live_."
          : mode === "test"
            ? "Set (test mode). Payments here are not real money."
            : "Set (live mode). Payments are real money.",
  });

  if (mode === "test" || mode === "live") {
    const ping = await pingPaystack();
    checks.push({
      label: "Paystack accepts the key",
      ok: ping.ok,
      detail: ping.ok ? "Paystack answered." : ping.error,
    });
  }

  const base = siteUrl();
  checks.push({
    label: "Return address",
    ok: !/localhost/.test(base),
    detail: /localhost/.test(base)
      ? "The site address falls back to localhost. Set SITE_URL in Vercel (Production) to https://lms.kadsamhsa.kdsg.gov.ng."
      : `Learners return to ${base}/dashboard/payments/callback after paying.`,
  });

  const admin = createAdminClient();
  const payments = await admin.from("payments").select("id, channel, fees_kobo", { head: true, count: "exact" }).limit(1);
  checks.push({
    label: "Payments table",
    ok: !payments.error,
    detail: payments.error
      ? "Missing or out of date. Run the payments database update (supabase/apply-payments.sql)."
      : "Ready.",
  });

  const { data: courses, error } = await admin.from("courses").select("title, price_kobo, status").eq("status", "published");
  if (!error) {
    for (const course of courses ?? []) {
      const naira = (course.price_kobo ?? 0) / 100;
      checks.push({
        label: `Charge: ${course.title}`,
        ok: naira > 0,
        detail:
          naira > 0
            ? `${new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(naira)} administrative fee.`
            : "No charge set, so learners enrol for free. Set it on the course analytics page.",
      });
    }
  }

  checks.push({
    label: "Receipt emails",
    ok: emailConfigured(),
    detail: emailConfigured()
      ? "On. Learners get a receipt when they pay."
      : "Off. Add RESEND_API_KEY and MAIL_FROM in Vercel so receipts are emailed.",
  });
  return checks;
}
