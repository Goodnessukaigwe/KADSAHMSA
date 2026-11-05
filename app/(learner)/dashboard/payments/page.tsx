import { reconcilePendingPayments } from "@/lib/payments/checkout";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/permissions";

export const metadata = { title: "Payments" };

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });

const label = { success: "Paid", pending: "Pending", failed: "Not completed" } as const;

export default async function PaymentsPage() {
  const user = await requireUser();
  await reconcilePendingPayments(user.id);
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("id, reference, status, paid_at, created_at, course_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const ids = [...new Set((payments ?? []).map((row) => row.course_id))];
  const { data: courses } = ids.length
    ? await supabase.from("courses").select("id, title").in("id", ids)
    : { data: [] as { id: string; title: string }[] };
  const titles = new Map((courses ?? []).map((course) => [course.id, course.title]));

  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payments</h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">
        Your administrative payments appear here, with their reference numbers.
      </p>

      {payments && payments.length > 0 ? (
        <ul className="mt-10 max-w-2xl space-y-3">
          {payments.map((row) => (
            <li key={row.id} className="rounded-[24px] bg-white px-6 py-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">{titles.get(row.course_id) ?? "Course"}</p>
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                {label[row.status]} · {when.format(new Date(row.paid_at ?? row.created_at))} · Ref{" "}
                {row.reference}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-10 max-w-lg rounded-[28px] bg-white px-8 py-16">
          <h2 className="text-xl font-bold">No payments yet</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Courses you are invited to by KADSAMHSA are free. A receipt shows here when you pay the administrative fee for a course.
          </p>
        </div>
      )}
    </div>
  );
}
