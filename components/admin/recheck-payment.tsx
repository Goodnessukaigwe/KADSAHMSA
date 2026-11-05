"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { recheckPayment } from "@/lib/payments/actions";

export function RecheckPayment({ reference }: { reference: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setPending(true);
    setMessage(null);
    const result = await recheckPayment(reference);
    setMessage(result.ok ? result.message : result.error);
    setPending(false);
    if (result.ok) router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={() => void run()}
        disabled={pending}
        className="h-8 rounded-full border border-neutral-300 px-3 text-[11px] font-bold tracking-[0.1em] uppercase disabled:opacity-50"
      >
        {pending ? "Checking…" : "Check again"}
      </button>
      {message ? <span className="max-w-[16rem] text-xs text-neutral-500">{message}</span> : null}
    </span>
  );
}
