"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ConfirmModal } from "@/components/admin/confirm-modal";
import { OrgEnrolTools } from "@/components/org/org-enrol-tools";
import { OrgMembersTable } from "@/components/org/org-members-table";
import { OrgProgressCards } from "@/components/org/org-progress-cards";
import { setOrganisationStatus, setSeatLimit } from "@/lib/org/actions";
import type { OrgDetail } from "@/lib/org/types";
import { cn } from "@/lib/utils";

export function OrgDetail({ detail }: { detail: OrgDetail }) {
  const router = useRouter();
  const { org } = detail;
  const [seats, setSeats] = useState(String(org.seatLimit));
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

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
    setRejectOpen(false);
    router.refresh();
  }

  function closeRejectModal() {
    if (pending) return;
    setRejectOpen(false);
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

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
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

        <div className="ml-auto flex min-w-0 max-w-full flex-col items-end gap-2">
          <div className="flex max-w-full flex-wrap items-end justify-end gap-2">
            <form onSubmit={(event) => void saveSeats(event)} className="flex flex-wrap items-end gap-2">
              <label className="flex flex-col text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
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
                onClick={() => setRejectOpen(true)}
                className="h-11 rounded-full bg-red-600 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
              >
                Reject
              </button>
            )}
          </div>
          {message ? <p className="text-sm text-neutral-500">{message}</p> : null}
        </div>
      </div>

      <div className="mt-8">
        <OrgEnrolTools organisationId={org.id} courses={detail.courses} />
      </div>

      <OrgProgressCards rows={detail.members} />

      <div className="mt-8">
        <OrgMembersTable organisationId={org.id} members={detail.members} />
      </div>

      <ConfirmModal
        open={rejectOpen}
        title="Are you sure?"
        description={`Reject ${org.name}? They can be approved again later.`}
        confirmLabel={pending ? "Rejecting…" : "Reject"}
        pending={pending}
        danger
        onCancel={closeRejectModal}
        onConfirm={() => void setStatus("rejected")}
      />
    </div>
  );
}
