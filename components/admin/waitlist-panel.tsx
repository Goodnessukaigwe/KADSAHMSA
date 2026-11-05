"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { WaitlistEntry } from "@/lib/waitlist/queries";
import { giveWaitlistAccess } from "@/lib/waitlist/actions";

const when = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

export function WaitlistPanel({ entries, ready }: { entries: WaitlistEntry[]; ready: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function give(id: string) {
    setBusy(id);
    setMessage(null);
    const result = await giveWaitlistAccess(id);
    setBusy(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Access given.");
    router.refresh();
  }

  const waiting = entries.filter((entry) => entry.status === "waiting");

  return (
    <section id="waitlist" className="mt-6 max-w-3xl scroll-mt-24 rounded-[24px] bg-white p-6">
      <h2 className="text-lg font-bold">Waitlist</h2>
      <p className="mt-1 text-sm text-neutral-500">
        People who asked to be considered for this course. Give access enrols them free of charge, once they have
        registered with the same email.
      </p>
      {!ready ? (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The waitlist table is not set up yet. Run the waitlist database update first.
        </p>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">No one on the waitlist yet.</p>
      ) : (
        <>
          <p className="mt-3 text-sm font-semibold">
            {waiting.length} waiting · {entries.length - waiting.length} given access
          </p>
          {message ? <p className="mt-2 text-sm text-neutral-600">{message}</p> : null}
          <ul className="mt-3 divide-y divide-neutral-100">
            {entries.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{entry.name}</p>
                  <p className="text-neutral-500">
                    {entry.email}
                    {entry.phone ? ` · ${entry.phone}` : ""}
                    {entry.organisation ? ` · ${entry.organisation}` : ""}
                  </p>
                  <p className="text-xs text-neutral-400">Joined {when.format(new Date(entry.createdAt))}</p>
                </div>
                {entry.status === "invited" ? (
                  <span className="inline-flex h-8 items-center rounded-full bg-emerald-50 px-3 text-[11px] font-bold tracking-[0.1em] text-emerald-700 uppercase">
                    Given access
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void give(entry.id)}
                    className="h-9 rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.1em] text-white uppercase disabled:opacity-50"
                  >
                    {busy === entry.id ? "Adding…" : "Give access"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
