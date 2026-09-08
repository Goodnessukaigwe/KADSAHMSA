"use client";

import { useRouter } from "next/navigation";

import { OrgEnrolTools } from "@/components/org/org-enrol-tools";
import { OrgMembersTable } from "@/components/org/org-members-table";
import { OrgReportTable } from "@/components/org/org-report-table";
import type { OrgInviteRow, OrgMemberRow, OrgOption, OrgSummary, ReportRow } from "@/lib/org/types";
import { cn } from "@/lib/utils";

export function OrgDashboard({
  org,
  members,
  invites,
  courses,
  staffOrgs,
  reports,
}: {
  org: OrgSummary | null;
  members: OrgMemberRow[];
  invites: OrgInviteRow[];
  courses: { id: string; slug: string; title: string }[];
  staffOrgs: OrgOption[];
  reports: ReportRow[];
}) {
  const router = useRouter();

  if (!org) {
    return (
      <div className="pb-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Organisation dashboard
        </h1>
        <p className="mt-2 max-w-xl text-sm text-neutral-400">
          {staffOrgs.length === 0
            ? "No organisations yet. Create one from Admin → Organisations after applying the Phase 5 SQL."
            : "Choose an organisation to preview."}
        </p>
      </div>
    );
  }

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{org.name}</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Staff of this organisation only. {org.seatsUsed} of {org.seatLimit} seats used.
          </p>
        </div>
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

      {staffOrgs.length > 1 ? (
        <label className="mt-6 block max-w-sm text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          Preview organisation
          <select
            value={org.id}
            onChange={(event) => router.push(`/org?org=${event.target.value}`)}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium tracking-normal text-neutral-950 outline-none"
          >
            {staffOrgs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {org.status !== "approved" ? (
        <p className="mt-6 rounded-[24px] bg-white px-5 py-4 text-sm text-neutral-500">
          {org.status === "pending"
            ? "This organisation is waiting for KADSAMHSA approval."
            : "This organisation was not approved."}
        </p>
      ) : null}

      <div className="mt-8">
        <OrgEnrolTools organisationId={org.id} courses={courses} invites={invites} />
      </div>
      <div className="mt-8">
        <OrgMembersTable organisationId={org.id} members={members} />
      </div>
      <div className="mt-8">
        <OrgReportTable
          rows={reports}
          filename={`${org.name.replace(/\s+/g, "-").toLowerCase()}-report.csv`}
        />
      </div>
    </div>
  );
}
