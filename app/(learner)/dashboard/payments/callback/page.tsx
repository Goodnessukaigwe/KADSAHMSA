import Link from "next/link";
import { redirect } from "next/navigation";

import { fulfilPayment } from "@/lib/payments/checkout";
import { requireUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Payment" };

export default async function PaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const user = await requireUser();
  const { reference, trxref } = await searchParams;
  const ref = (reference ?? trxref ?? "").trim();
  if (!ref) redirect("/dashboard/payments");

  // A learner can only confirm their own payment (row-level security hides others).
  const supabase = await createClient();
  const { data: own } = await supabase
    .from("payments")
    .select("id")
    .eq("reference", ref)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!own) redirect("/dashboard/payments");

  const result = await fulfilPayment(ref);
  if (result.ok) redirect(`/learn/${result.courseSlug}`);

  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payment</h1>
      <div className="mt-8 max-w-lg rounded-[28px] bg-white px-8 py-12">
        <h2 className="text-xl font-bold">
          {result.pending ? "Still confirming your payment" : "Payment not completed"}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {result.error}{" "}
          {result.pending
            ? "This can take a minute. If you were charged, you will be enrolled automatically."
            : "You have not been charged for an incomplete payment."}
        </p>
        <Link
          href="/dashboard/payments"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white"
        >
          View my payments
        </Link>
      </div>
    </div>
  );
}
