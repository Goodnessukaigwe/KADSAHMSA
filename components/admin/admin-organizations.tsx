"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { createOrganisation, setOrganisationStatus } from "@/lib/org/actions";
import type { OrgSummary } from "@/lib/org/types";
import { cn } from "@/lib/utils";

export function AdminOrganizations({ orgs }: { orgs: OrgSummary[] }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [statusPending, setStatusPending] = useState<string | null>(null);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = event.currentTarget;
    setPending(true);
    setMessage(null);
    const result = await createOrganisation(new FormData(form));
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    form.reset();
    setMessage("Organisation created.");
    router.refresh();
  }

  async function setStatus(id: string, status: "approved" | "rejected" | "pending") {
    if (statusPending) return;
    setStatusPending(id);
    setMessage(null);
    const result = await setOrganisationStatus(id, status);
    setStatusPending(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Organisations
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-400">
            Approve organisations, set seat limits, and assign members. Seats are a staff quota, not paid packs.
          </p>
        </div>
      </div>

      <form
        onSubmit={(event) => void create(event)}
        className="mt-8 grid gap-3 rounded-[24px] bg-white p-5 sm:grid-cols-[1fr_140px_auto_auto]"
      >
        <label className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          Name
          <input
            name="name"
            required
            minLength={2}
            placeholder="Organisation name"
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-medium tracking-normal text-neutral-950 outline-none"
          />
        </label>
        <label className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          Seats
          <input
            name="seatLimit"
            type="number"
            min={0}
            defaultValue={10}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-medium tracking-normal text-neutral-950 outline-none"
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm text-neutral-600">
          <input type="checkbox" name="approved" defaultChecked />
          Approve now
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-11 self-end rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create"}
        </button>
        {message ? <p className="sm:col-span-4 text-sm text-neutral-500">{message}</p> : null}
      </form>

      <div className="mt-8 overflow-hidden rounded-[24px] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                <th className="px-5 py-4 font-bold">Organisation</th>
                <th className="px-2 py-4 font-bold">Status</th>
                <th className="px-2 py-4 font-bold">Seats</th>
                <th className="px-2 py-4 font-bold">Created</th>
                <th className="px-5 py-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {orgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-sm text-neutral-400">
                    No organisations yet. Create one above, then apply apply-phase5.sql if this stays empty.
                  </td>
                </tr>
              ) : (
                orgs.map((org) => (
                  <tr key={org.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-5 py-4 font-semibold">{org.name}</td>
                    <td className="px-2 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase",
                          org.status === "approved"
                            ? "bg-emerald-50 text-emerald-700"
                            : org.status === "rejected"
                              ? "bg-red-50 text-red-700"
                              : "bg-neutral-100 text-neutral-600"
                        )}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="px-2 py-4 text-neutral-500">
                      {org.seatsUsed}/{org.seatLimit}
                    </td>
                    <td className="px-2 py-4 text-neutral-500">{org.createdAt}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        {org.status !== "approved" ? (
                          <button
                            type="button"
                            disabled={statusPending !== null}
                            onClick={() => void setStatus(org.id, "approved")}
                            className="h-9 rounded-full bg-emerald-50 px-4 text-[11px] font-bold tracking-[0.12em] text-emerald-700 uppercase disabled:opacity-60"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={statusPending !== null}
                            onClick={() => void setStatus(org.id, "rejected")}
                            className="h-9 rounded-full bg-neutral-100 px-4 text-[11px] font-bold tracking-[0.12em] uppercase disabled:opacity-60"
                          >
                            Reject
                          </button>
                        )}
                        <Link
                          href={`/admin/organizations/${org.id}`}
                          className="inline-flex h-9 items-center rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
