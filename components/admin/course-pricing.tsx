"use client";

import { useState } from "react";

import { setCoursePricing } from "@/lib/payments/actions";

export function CoursePricing({
  slug,
  priceNaira,
  paymentsReady,
}: {
  slug: string;
  priceNaira: number;
  paymentsReady: boolean;
}) {
  const [price, setPrice] = useState(String(priceNaira));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    const result = await setCoursePricing(slug, Number(price || 0));
    setMessage(result.ok ? "Saved." : result.error);
    setPending(false);
  }

  return (
    <form onSubmit={save} className="mt-8 max-w-xl rounded-[24px] bg-white p-6">
      <h2 className="text-lg font-bold">Price</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Learners who enrol themselves pay this through Paystack. People you add yourself, below, get
        access free of charge. A price of 0 makes the course free for everyone.
      </p>
      {!paymentsReady ? (
        <p className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Paystack is not connected yet, so learners cannot pay. Add the Paystack keys to switch it on.
        </p>
      ) : null}
      <label className="mt-5 block text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
        Price (naira)
        <input
          type="number"
          min={0}
          step={1}
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm font-medium tracking-normal text-neutral-950 outline-none sm:max-w-xs"
        />
      </label>
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
