import "server-only";

import { listUserEmails } from "@/lib/auth/admin-users";
import { createAdminClient } from "@/lib/supabase/admin";

export type PaymentRow = {
  reference: string;
  status: "pending" | "success" | "failed";
  createdAt: string;
  paidAt: string | null;
  learnerName: string;
  learnerEmail: string;
  course: string;
  amountKobo: number;
  feesKobo: number | null;
  channel: string | null;
  transactionId: string | null;
};

export type PaymentSummary = {
  course: string;
  payments: number;
  grossKobo: number;
  feesKobo: number;
};

/** All payments, newest first, optionally for one month ("YYYY-MM"). */
export async function listPayments(month?: string | null) {
  const admin = createAdminClient();
  let query = admin
    .from("payments")
    .select(
      "reference, status, created_at, paid_at, user_id, course_id, amount_kobo, fees_kobo, channel, paystack_transaction_id"
    )
    .order("created_at", { ascending: false })
    .limit(5000);
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    query = query.gte("created_at", start.toISOString()).lt("created_at", end.toISOString());
  }
  const { data, error } = await query;
  if (error) return { rows: [] as PaymentRow[], summary: [] as PaymentSummary[], ready: false };

  const [{ data: profiles }, { data: courses }, emails] = await Promise.all([
    admin.from("profiles").select("id, full_name"),
    admin.from("courses").select("id, title"),
    listUserEmails(admin),
  ]);
  const nameOf = new Map((profiles ?? []).map((row) => [row.id, row.full_name.trim()]));
  const courseOf = new Map((courses ?? []).map((row) => [row.id, row.title]));

  const rows: PaymentRow[] = (data ?? []).map((row) => ({
    reference: row.reference,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at,
    learnerName: nameOf.get(row.user_id) ?? "",
    learnerEmail: emails.get(row.user_id) ?? "",
    course: courseOf.get(row.course_id) ?? "",
    amountKobo: row.amount_kobo,
    feesKobo: row.fees_kobo,
    channel: row.channel,
    transactionId: row.paystack_transaction_id,
  }));

  const byCourse = new Map<string, PaymentSummary>();
  for (const row of rows) {
    if (row.status !== "success") continue;
    const entry = byCourse.get(row.course) ?? { course: row.course, payments: 0, grossKobo: 0, feesKobo: 0 };
    entry.payments += 1;
    entry.grossKobo += row.amountKobo;
    entry.feesKobo += row.feesKobo ?? 0;
    byCourse.set(row.course, entry);
  }
  return { rows, summary: [...byCourse.values()], ready: true };
}
