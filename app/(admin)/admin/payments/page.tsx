import Link from "next/link";

import { RecheckPayment } from "@/components/admin/recheck-payment";
import { listPayments } from "@/lib/admin/payments";

export const metadata = { title: "Payments" };

const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" });
const money = (kobo: number) => naira.format(kobo / 100);
const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const { rows, summary, ready } = await listPayments(month);
  const paid = rows.filter((row) => row.status === "success");
  const gross = paid.reduce((sum, row) => sum + row.amountKobo, 0);
  const fees = paid.reduce((sum, row) => sum + (row.feesKobo ?? 0), 0);
  const exportHref = `/api/admin/export?kind=payments${month ? `&month=${encodeURIComponent(month)}` : ""}`;

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payments</h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-500">
            Every KADSAMHSA LMS payment. On Paystack, search Transactions for <strong>KADLMS</strong> to
            find the same payments. Use the CSV to reconcile against the bank statement and plan payouts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <form className="flex items-center gap-2">
            <input
              type="month"
              name="month"
              defaultValue={month ?? ""}
              className="h-11 rounded-xl border border-neutral-200 px-3 text-sm outline-none"
            />
            <button className="h-11 rounded-full border border-neutral-200 px-5 text-sm font-semibold">
              Filter
            </button>
          </form>
          <a
            href={exportHref}
            className="inline-flex h-11 items-center rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white"
          >
            Download CSV
          </a>
        </div>
      </div>

      {!ready ? (
        <p className="mt-8 max-w-xl rounded-2xl bg-amber-50 px-5 py-4 text-sm text-amber-900">
          The payments table is not set up yet. Run the payments database update first.
        </p>
      ) : (
        <>
          <dl className="mt-8 grid gap-3 sm:grid-cols-4">
            {[
              ["Paid", String(paid.length)],
              ["Collected", money(gross)],
              ["Paystack fees", money(fees)],
              ["Net received", money(gross - fees)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white px-5 py-4">
                <dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{label}</dt>
                <dd className="mt-1 text-2xl font-bold">{value}</dd>
              </div>
            ))}
          </dl>

          {summary.length > 0 ? (
            <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-[11px] tracking-[0.12em] text-neutral-400 uppercase">
                  <tr>
                    <th className="px-5 py-3">Course</th>
                    <th className="px-5 py-3">Payments</th>
                    <th className="px-5 py-3">Collected</th>
                    <th className="px-5 py-3">Fees</th>
                    <th className="px-5 py-3">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={row.course} className="border-t border-neutral-100">
                      <td className="px-5 py-3 font-medium">{row.course}</td>
                      <td className="px-5 py-3">{row.payments}</td>
                      <td className="px-5 py-3">{money(row.grossKobo)}</td>
                      <td className="px-5 py-3">{money(row.feesKobo)}</td>
                      <td className="px-5 py-3">{money(row.grossKobo - row.feesKobo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-6 overflow-x-auto rounded-2xl bg-white">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="text-[11px] tracking-[0.12em] text-neutral-400 uppercase">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Learner</th>
                  <th className="px-5 py-3">Course</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Channel</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Reference</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-neutral-500">
                      No payments yet.{" "}
                      <Link href="/admin/courses" className="underline">
                        Set course prices
                      </Link>
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.reference} className="border-t border-neutral-100">
                      <td className="px-5 py-3 whitespace-nowrap">{when.format(new Date(row.paidAt ?? row.createdAt))}</td>
                      <td className="px-5 py-3">
                        {row.learnerName || "—"}
                        <span className="block text-xs text-neutral-500">{row.learnerEmail}</span>
                      </td>
                      <td className="px-5 py-3">{row.course}</td>
                      <td className="px-5 py-3 whitespace-nowrap">{money(row.amountKobo)}</td>
                      <td className="px-5 py-3">{row.channel ?? "—"}</td>
                      <td className="px-5 py-3">
                        {row.status === "success" ? "Paid" : row.status === "pending" ? "Pending" : "Not completed"}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">
                        {row.reference}
                        {row.status === "pending" ? (
                          <span className="mt-2 block">
                            <RecheckPayment reference={row.reference} />
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
