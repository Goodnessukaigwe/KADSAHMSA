export const metadata = { title: "Payments" };

export default function PaymentsPage() {
  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Payments</h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">
        Receipts for paid courses appear here when checkout is available.
      </p>

      <div className="mt-10 max-w-lg rounded-[28px] bg-white px-8 py-16">
        <h2 className="text-xl font-bold">No payments yet</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          No payments yet. DPTC and other free courses do not charge.
        </p>
      </div>
    </div>
  );
}
