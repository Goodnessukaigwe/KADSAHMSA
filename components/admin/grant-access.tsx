"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { staffGrantAccessByEmails, type GrantAccessResult } from "@/lib/courses/actions";

export function GrantAccess({ slug }: { slug: string }) {
  const router = useRouter();
  const [emails, setEmails] = useState("");
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<GrantAccessResult | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setResult(null);
    const next = await staffGrantAccessByEmails(slug, emails);
    setResult(next);
    setPending(false);
    if (next.ok) {
      setEmails("");
      router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 max-w-xl rounded-[24px] bg-white p-6">
      <h2 className="text-lg font-bold">Give access free of charge</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Paste the email addresses of the people who should get this course without paying, one per
        line or separated by commas. They must have registered on the site first.
      </p>
      <textarea
        value={emails}
        onChange={(event) => setEmails(event.target.value)}
        rows={6}
        placeholder={"name@example.org\nanother@example.org"}
        className="mt-4 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-950"
      />
      <div className="mt-4 flex items-center gap-4">
        <button
          type="submit"
          disabled={pending || emails.trim() === ""}
          className="h-11 rounded-full bg-neutral-950 px-6 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Adding…" : "Give access"}
        </button>
      </div>
      {result ? (
        result.ok ? (
          <div className="mt-4 space-y-2 text-sm" role="status">
            <p className="font-semibold text-emerald-700">
              {result.enrolled} {result.enrolled === 1 ? "person now has" : "people now have"} access.
            </p>
            {result.noAccount.length > 0 ? (
              <p className="text-amber-800">
                No account yet (ask them to register, then add them again):{" "}
                {result.noAccount.join(", ")}
              </p>
            ) : null}
            {result.invalid.length > 0 ? (
              <p className="text-red-700">Not valid or could not be added: {result.invalid.join(", ")}</p>
            ) : null}
          </div>
        ) : (
          <p className="mt-4 text-sm text-red-700" role="alert">
            {result.error}
          </p>
        )
      ) : null}
    </form>
  );
}
