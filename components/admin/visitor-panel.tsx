"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { removeUserAccount } from "@/lib/admin/user-actions";
import { getVisitorProfile, type VisitorProfile } from "@/lib/help/actions";
import { cn } from "@/lib/utils";

const LABEL = "text-[11px] font-bold tracking-[0.16em] text-neutral-400 uppercase";

function when(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "";
  }
}

/** Everything about the person in the open conversation, with the power to remove their account. */
export function VisitorPanel({
  chatId,
  isSuperAdmin,
  onOpenChat,
  onRemoved,
}: {
  chatId: string;
  isSuperAdmin: boolean;
  onOpenChat: (id: string) => void;
  onRemoved: () => void;
}) {
  const [profile, setProfile] = useState<VisitorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProfile(null);
    setError(null);
    void getVisitorProfile(chatId).then((result) => {
      if (cancelled) return;
      if (result.ok) setProfile(result.profile);
      else setError(result.error);
    });
    return () => {
      cancelled = true;
    };
  }, [chatId]);

  if (error) return <p className="rounded-2xl bg-white p-4 text-sm text-red-600">{error}</p>;
  if (!profile) return <p className="rounded-2xl bg-white p-4 text-sm text-neutral-400">Loading details…</p>;

  const account = profile.account;

  async function remove() {
    if (!account) return;
    setRemoving(true);
    setRemoveError(null);
    const result = await removeUserAccount(account.id, typed);
    setRemoving(false);
    if (!result.ok) {
      setRemoveError(result.error);
      return;
    }
    setConfirming(false);
    setTyped("");
    onRemoved();
  }

  return (
    <aside className="space-y-5 rounded-[24px] bg-white p-4 sm:p-5">
      <div>
        <p className={LABEL}>About this person</p>
        <p className="mt-2 text-lg font-bold">{account?.name || profile.name || "Visitor"}</p>
        <p className="text-sm break-all text-neutral-500">{account?.email || profile.email || "No email"}</p>
        <p className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold tracking-wide uppercase">
          <span className={cn("rounded-full px-2.5 py-1", account ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-500")}>
            {account ? "Has an account" : "No account"}
          </span>
          {account?.roles
            .filter((role) => role !== "learner")
            .map((role) => (
              <span key={role} className="rounded-full bg-[#c9a227]/20 px-2.5 py-1 text-[#7a5e00]">
                {role.replace("_", " ")}
              </span>
            ))}
        </p>
        <dl className="mt-3 space-y-1 text-sm">
          {account ? (
            <>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Joined</dt>
                <dd>{account.joined}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Organisation</dt>
                <dd className="text-right">{account.organisationName || "None"}</dd>
              </div>
            </>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-400">Chat started</dt>
            <dd>{when(profile.startedAt)}</dd>
          </div>
          {profile.page ? (
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-400">From page</dt>
              <dd className="max-w-[60%] truncate">{profile.page}</dd>
            </div>
          ) : null}
        </dl>
        {account ? (
          <Link
            href={`/admin/users/${account.id}`}
            className="mt-3 inline-flex h-9 items-center rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
          >
            Open full profile
          </Link>
        ) : null}
      </div>

      {account ? (
        <>
          <div>
            <p className={LABEL}>Courses</p>
            {account.enrolments.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-400">Not enrolled in any course.</p>
            ) : (
              <ul className="mt-2 space-y-3">
                {account.enrolments.map((row) => (
                  <li key={row.slug}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-semibold">{row.title}</span>
                      <span className="shrink-0 text-neutral-500">{row.percent}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full bg-neutral-950" style={{ width: `${row.percent}%` }} />
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      {row.completed} of {row.total} modules done
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className={LABEL}>Certificates</p>
            {account.certificates.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-400">None yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {account.certificates.map((cert) => (
                  <li key={cert.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{cert.title}</span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {cert.scorePercent}% · {cert.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className={LABEL}>Recent activity</p>
            {account.activity.length === 0 ? (
              <p className="mt-2 text-sm text-neutral-400">Nothing yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {account.activity.map((item) => (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span className="min-w-0">{item.label}</span>
                    <span className="shrink-0 text-xs text-neutral-400">{item.when}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}

      <div>
        <p className={LABEL}>Other conversations</p>
        {profile.otherChats.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">None.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {profile.otherChats.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  onClick={() => onOpenChat(row.id)}
                  className="w-full rounded-xl bg-neutral-50 px-3 py-2 text-left text-sm hover:bg-neutral-100"
                >
                  <span className="block truncate">{row.lastText || "(no message)"}</span>
                  <span className="text-xs text-neutral-400">
                    {row.status} · {when(row.lastAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className={LABEL}>Tickets</p>
        {profile.tickets.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-400">None.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {profile.tickets.map((ticket) => (
              <li key={ticket.id} className="rounded-xl bg-neutral-50 px-3 py-2 text-sm">
                <span className="block truncate">{ticket.message}</span>
                <span className="text-xs text-neutral-400">
                  {ticket.category} · {ticket.status} · {when(ticket.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {profile.tickets.length ? (
          <Link href="/admin/feedback" className="mt-2 inline-block text-xs font-semibold text-neutral-500 underline">
            Open Feedback
          </Link>
        ) : null}
      </div>

      {account && isSuperAdmin && !account.isAdmin ? (
        <div className="border-t border-neutral-100 pt-4">
          <p className={LABEL}>Danger zone</p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-2 h-10 w-full rounded-full border border-red-300 text-[11px] font-bold tracking-[0.12em] text-red-700 uppercase hover:bg-red-50"
          >
            Remove this user
          </button>
        </div>
      ) : null}

      {confirming && account ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold">Remove {account.name}?</h3>
            <p className="mt-2 text-sm leading-relaxed text-neutral-600">
              This permanently deletes their account, enrolments, progress, quiz results and{" "}
              <strong>{account.certificates.length} certificate{account.certificates.length === 1 ? "" : "s"}</strong>{" "}
              (those certificates will stop verifying). It cannot be undone. Their chat history stays.
            </p>
            <label className="mt-4 block text-sm">
              Type <strong className="break-all">{account.email}</strong> to confirm
              <input
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:border-red-500"
              />
            </label>
            {removeError ? <p className="mt-3 text-sm text-red-600">{removeError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                  setRemoveError(null);
                }}
                className="h-10 rounded-full bg-neutral-100 px-5 text-[11px] font-bold tracking-[0.12em] uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removing || typed.trim().toLowerCase() !== account.email.toLowerCase()}
                onClick={() => void remove()}
                className="h-10 rounded-full bg-red-600 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-40"
              >
                {removing ? "Removing…" : "Remove permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
