"use client";

import { useState } from "react";

import { setCoursePricing } from "@/lib/payments/actions";

export function CoursePricing({
  slug,
  priceNaira,
  freeSeatLimit,
  freeSeatsLeft,
  paymentsReady,
}: {
  slug: string;
  priceNaira: number;
  freeSeatLimit: number | null;
  freeSeatsLeft: number | null;
  paymentsReady: boolean;
}) {
  const [price, setPrice] = useState(String(priceNaira));
  const [limit, setLimit] = useState(freeSeatLimit === null ? "" : String(freeSeatLimit));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await setCoursePricing(
      slug,
      Number(price || 0),
      limit.trim() === "" ? null : Number(limit)
    );
    setMessage(result.ok ? "Saved." : result.error);
    setPending(false);
  }

  return (
    <form onSubmit={save} className="mt-8 max-w-xl rounded-[24px] bg-white p-6">
      <h2 className="text-lg font-bold">Price and free places</h2>
      <p className="mt-1 text-sm text-neutral-500">
        The first learners enrol free. After that, learners pay the price below through Paystack.
        {freeSeatsLeft !== null ? ` Free places left: ${freeSeatsLeft}.` : ""}
      </p>
      {!paymentsReady ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Paystack is not connected yet, so learners cannot pay. Add the Paystack keys to switch it on.
        </p>
      ) : null}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          Price (naira)
          <input
            type="number"
            min={0}
            step={1}
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm font-medium tracking-normal text-neutral-950 outline-none"
          />
        </label>
        <label className="block text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          Free places
          <input
            type="number"
            min={0}
            step={1}
            value={limit}
            placeholder="No limit"
            onChange={(event) => setLimit(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm font-medium tracking-normal text-neutral-950 outline-none"
          />
        </label>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {message ? <span className="text-sm text-neutral-500">{message}</span> : null}
      </div>
    </form>
  );
}
