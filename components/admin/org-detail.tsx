"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { OrgEnrolTools } from "@/components/org/org-enrol-tools";
import { OrgMembersTable } from "@/components/org/org-members-table";
import { setOrganisationStatus, setSeatLimit } from "@/lib/org/actions";
import type { OrgDetail } from "@/lib/org/types";
import { cn } from "@/lib/utils";

export function OrgDetail({ detail }: { detail: OrgDetail }) {
  const router = useRouter();
  const { org } = detail;
  const [seats, setSeats] = useState(String(org.seatLimit));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function saveSeats(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const value = Number(seats);
    setPending(true);
    setMessage(null);
    const result = await setSeatLimit(org.id, value);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(`Seat limit saved (${value}).`);
    router.refresh();
  }

  async function setStatus(status: "approved" | "rejected" | "pending") {
    if (pending) return;
    setPending(true);
    setMessage(null);
    const result = await setOrganisationStatus(org.id, status);
    setPending(false);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="pb-16">
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase hover:text-neutral-950"
      >
        <ArrowLeft className="size-3.5" />
        Back to organisations
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{org.name}</h1>
            <span
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.08em] uppercase",
                org.status === "approved"
                  ? "bg-emerald-50 text-emerald-700"
                  : org.status === "rejected"
                    ? "bg-red-50 text-red-700"
                    : "bg-neutral-100 text-neutral-600"
              )}
            >
              {org.status}
            </span>
          </div>
          <p className="mt-2 text-sm text-neutral-400">
            {org.seatsUsed} of {org.seatLimit} seats used · Created {org.createdAt}
          </p>
        </div>
        <Link
          href={`/org?org=${org.id}`}
          className="inline-flex h-10 items-center rounded-full bg-neutral-100 px-4 text-[11px] font-bold tracking-[0.12em] uppercase"
        >
          Preview dashboard
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-[24px] bg-white p-5">
        <form onSubmit={(event) => void saveSeats(event)} className="flex flex-wrap items-end gap-2">
          <label className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Seat limit
            <input
              type="number"
              min={0}
              value={seats}
              onChange={(event) => setSeats(event.target.value)}
              className="mt-2 h-11 w-28 rounded-xl border border-neutral-200 px-3 text-sm font-medium tracking-normal text-neutral-950 outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-11 rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
          >
            Save seats
          </button>
        </form>
        {org.status !== "approved" ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => void setStatus("approved")}
            className="h-11 rounded-full bg-emerald-50 px-5 text-[11px] font-bold tracking-[0.12em] text-emerald-700 uppercase disabled:opacity-60"
          >
            Approve
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            onClick={() => void setStatus("rejected")}
            className="h-11 rounded-full bg-neutral-100 px-5 text-[11px] font-bold tracking-[0.12em] uppercase disabled:opacity-60"
          >
            Reject
          </button>
        )}
        {message ? <p className="w-full text-sm text-neutral-500">{message}</p> : null}
      </div>

      <div className="mt-8">
        <OrgEnrolTools
          organisationId={org.id}
          courses={detail.courses}
          invites={detail.invites}
        />
      </div>

      <div className="mt-8">
        <OrgMembersTable organisationId={org.id} members={detail.members} />
      </div>
    </div>
  );
}
