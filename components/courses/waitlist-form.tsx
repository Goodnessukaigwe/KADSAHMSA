"use client";

import { useState } from "react";

import { joinWaitlist } from "@/lib/waitlist/actions";

const field =
  "mt-1.5 h-11 w-full rounded-xl border border-white/15 bg-white/5 px-3.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/50";

export function WaitlistForm({
  courseSlug,
  defaultName = "",
  defaultEmail = "",
}: {
  courseSlug: string;
  defaultName?: string;
  defaultEmail?: string;
}) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await joinWaitlist({ courseSlug, name, email, phone, organisation, note: "", website });
    setPending(false);
    if (result.ok) setDone(true);
    else setError(result.error);
  }

  if (done) {
    return (
      <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm leading-relaxed" role="status">
        <p className="font-semibold">You are on the waitlist.</p>
        <p className="mt-1 text-white/70">We will write to {email} if a place is offered.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 border-t border-white/15 pt-5" aria-label="Join the waitlist">
      <h3 className="text-sm font-bold">Join the waitlist</h3>
      <p className="mt-1 text-xs leading-relaxed text-white/60">
        Leave your details and we will contact you if a place is offered.
      </p>
      <label className="mt-4 block text-[11px] font-semibold tracking-[0.12em] text-white/60 uppercase">
        Full name
        <input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={field} />
      </label>
      <label className="mt-3 block text-[11px] font-semibold tracking-[0.12em] text-white/60 uppercase">
        Email
        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={field} />
      </label>
      <label className="mt-3 block text-[11px] font-semibold tracking-[0.12em] text-white/60 uppercase">
        Phone (optional)
        <input value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className={field} />
      </label>
      <label className="mt-3 block text-[11px] font-semibold tracking-[0.12em] text-white/60 uppercase">
        Organisation (optional)
        <input value={organisation} onChange={(e) => setOrganisation(e.target.value)} autoComplete="organization" className={field} />
      </label>
      {/* Honeypot: hidden from people, filled in by bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-4 h-11 w-full rounded-full border border-white/40 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Join the waitlist"}
      </button>
    </form>
  );
}
