"use client";

import { useEffect, useState } from "react";

import { SplitCta } from "@/components/landing/split-cta";
import { verifyCertificate, type VerifyResult } from "@/lib/certificates/actions";

function formatIssued(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function VerifyCertificate({ initialId = "" }: { initialId?: string }) {
  const [id, setId] = useState(initialId);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    if (!initialId) return;
    let cancelled = false;
    setPending(true);
    void verifyCertificate(initialId).then((next) => {
      if (cancelled) return;
      setResult(next);
      setPending(false);
    });
    return () => {
      cancelled = true;
    };
  }, [initialId]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    const next = await verifyCertificate(id);
    setResult(next);
    setPending(false);
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <p className="text-[11px] font-bold tracking-[0.16em] text-neutral-400 uppercase">
        Public verify
      </p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
        Verify a certificate
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-500">
        Enter the ID printed on a KADSAMHSA certificate. This page shows only
        validity, the learner’s name, the course, and the issue date.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          Certificate ID
          <input
            required
            value={id}
            onChange={(event) => setId(event.target.value)}
            placeholder="KAD-…"
            autoComplete="off"
            className="mt-2 h-12 w-full rounded-xl border border-neutral-200 px-4 text-sm font-medium tracking-normal text-neutral-950 outline-none"
          />
        </label>
        <SplitCta type="submit" size="sm">
          {pending ? "Checking…" : "Verify"}
        </SplitCta>
      </form>

      {result ? <VerifyOutcome result={result} /> : null}
    </div>
  );
}

function VerifyOutcome({ result }: { result: VerifyResult }) {
  if (result.status === "not_found") {
    return (
      <div className="mt-10 rounded-[24px] bg-neutral-50 p-6" role="status">
        <h2 className="text-xl font-bold">No matching certificate</h2>
        <p className="mt-2 text-sm text-neutral-500">Check the ID and try again.</p>
      </div>
    );
  }

  if (result.status === "revoked") {
    return (
      <div className="mt-10 rounded-[24px] bg-red-50 p-6" role="status">
        <h2 className="text-xl font-bold">Revoked certificate</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          This certificate was issued to <strong>{result.learnerName}</strong> for{" "}
          <strong>{result.courseTitle}</strong>
          {result.issuedAt ? ` on ${formatIssued(result.issuedAt)}` : ""} but has
          since been revoked by KADSAMHSA.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 rounded-[24px] bg-emerald-50 p-6" role="status">
      <h2 className="text-xl font-bold">Valid certificate</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        <strong>{result.learnerName}</strong> completed{" "}
        <strong>{result.courseTitle}</strong>
        {result.issuedAt ? ` on ${formatIssued(result.issuedAt)}` : ""}.
      </p>
    </div>
  );
}
