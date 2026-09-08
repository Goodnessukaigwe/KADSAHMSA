"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import type { StaffLearnerRow } from "@/lib/certificates/queries";
import { downloadCsv, toCsv } from "@/lib/org/csv";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

export function AdminUsers({ learners = [] }: { learners?: StaffLearnerRow[] }) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(learners.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = useMemo(
    () => learners.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [learners, safePage]
  );

  function exportCsv() {
    downloadCsv(
      "kadsamhsa-learners.csv",
      toCsv(
        ["name", "email", "organisation", "certificates", "joined"],
        learners.map((learner) => [
          learner.name,
          learner.email,
          learner.organisationName || "Unattached",
          String(learner.certificateCount),
          learner.joined,
        ])
      )
    );
  }

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Learners
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-400">
            Registered accounts. Assign an organisation from the learner profile. Super admins can grant staff roles there.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={learners.length === 0}
            className="h-9 rounded-full bg-neutral-200 px-4 text-[11px] font-bold tracking-[0.12em] uppercase disabled:opacity-50"
          >
            Export CSV
          </button>
          <Link
            href="/admin/organizations"
            className="inline-flex h-9 items-center rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
          >
            Organisations
          </Link>
        </div>
      </div>

      <p className="mt-8 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
        Registered learners ({learners.length})
      </p>

      <div className="mt-4 overflow-hidden rounded-[24px] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                <th className="px-5 py-4 font-bold">Name</th>
                <th className="px-5 py-4 font-bold">Email</th>
                <th className="px-5 py-4 font-bold">Organisation</th>
                <th className="px-5 py-4 font-bold">Certificates</th>
                <th className="px-5 py-4 font-bold">Joined</th>
                <th className="px-5 py-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((learner) => (
                <tr key={learner.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold">
                        {initials(learner.name)}
                      </span>
                      <span className="font-semibold">{learner.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-neutral-500">{learner.email || "—"}</td>
                  <td className="px-5 py-4 text-neutral-500">
                    {learner.organisationName || "Unattached"}
                  </td>
                  <td className="px-5 py-4">{learner.certificateCount}</td>
                  <td className="px-5 py-4 text-neutral-500">{learner.joined}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/users/${learner.id}`}
                      className="inline-flex h-9 items-center rounded-full bg-neutral-100 px-4 text-[11px] font-bold tracking-[0.12em] uppercase"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {learners.length === 0 ? (
          <p className="px-5 py-10 text-sm text-neutral-400">
            No registered learners yet.
          </p>
        ) : null}
      </div>

      {learners.length > PAGE_SIZE ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-neutral-500">
          <span>Page:</span>
          <input
            type="number"
            min={1}
            max={pageCount}
            value={safePage}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (Number.isFinite(next)) {
                setPage(Math.min(pageCount, Math.max(1, next)));
              }
            }}
            className="h-8 w-12 rounded-md border border-neutral-200 bg-white text-center text-sm outline-none"
          />
          <span className={cn("text-neutral-400")}>/ {pageCount}</span>
        </div>
      ) : null}
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}
