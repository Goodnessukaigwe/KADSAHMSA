"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { SplitCta } from "@/components/landing/split-cta";
import {
  accountTotals,
  accountsToCsv,
  approveAdminAccount,
  inviteOrganisation,
  listAdminAccounts,
  type AccountKind,
  type AdminAccount,
} from "@/lib/content/admin-users";
import { cn } from "@/lib/utils";

type Tab = "all" | "pending" | "individuals" | "organisations";

const PAGE_SIZE = 6;

export function AdminUsers() {
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState(() => listAdminAccounts());
  const [totals, setTotals] = useState(() => accountTotals());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");

  const filtered = useMemo(() => {
    if (tab === "pending") return rows.filter((row) => row.status === "pending");
    if (tab === "individuals") return rows.filter((row) => row.kind === "individual");
    if (tab === "organisations") return rows.filter((row) => row.kind === "organisation");
    return rows;
  }, [rows, tab]);

  const showPager = tab === "individuals" || tab === "organisations";
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const visible = showPager
    ? filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    : filtered;

  function refresh() {
    setRows(listAdminAccounts());
    setTotals(accountTotals());
  }

  function changeTab(next: Tab) {
    setTab(next);
    setPage(1);
  }

  function exportCsv() {
    const blob = new Blob([accountsToCsv(filtered)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kadsamhsa-users.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  function submitInvite(event: React.FormEvent) {
    event.preventDefault();
    inviteOrganisation(orgName, orgEmail);
    setOrgName("");
    setOrgEmail("");
    setInviteOpen(false);
    changeTab("organisations");
    refresh();
  }

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Users & organizations
          </h1>
          <p className="mt-2 max-w-xl text-sm text-neutral-400">
            Search, manage access, and approve organization accounts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="h-9 rounded-full bg-neutral-200 px-4 text-[11px] font-bold tracking-[0.12em] uppercase"
          >
            Export CSV
          </button>
          <SplitCta icon="plus" size="sm" onClick={() => setInviteOpen(true)}>
            Invite organization
          </SplitCta>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-5" role="tablist">
        {(
          [
            ["all", "All"],
            ["pending", `Pending approvals (${totals.pending})`],
            ["individuals", `Individuals (${totals.individuals.toLocaleString()})`],
            ["organisations", `Organizations (${totals.organisations.toLocaleString()})`],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => changeTab(id)}
            className={cn(
              "border-b-2 pb-1.5 text-[11px] font-bold tracking-[0.14em] uppercase",
              tab === id
                ? "border-neutral-950 text-neutral-950"
                : "border-transparent text-neutral-400"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-8 overflow-hidden rounded-[24px] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                <th className="px-5 py-4 font-bold">Name</th>
                <th className="px-5 py-4 font-bold">Type</th>
                <th className="px-5 py-4 font-bold">Course(s)</th>
                <th className="px-5 py-4 font-bold">Progress</th>
                <th className="px-5 py-4 font-bold">Status</th>
                <th className="px-5 py-4">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <AccountRow
                  key={row.id}
                  row={row}
                  onApprove={() => {
                    approveAdminAccount(row.id);
                    refresh();
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-sm text-neutral-400">No accounts in this view.</p>
        ) : null}
      </div>

      {showPager ? (
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
          <span>/ {pageCount}</span>
        </div>
      ) : null}

      {inviteOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            onSubmit={submitInvite}
            className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-2xl"
          >
            <h2 className="text-xl font-bold">Invite organization</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Send a cohort seat pack. The account lands in pending approval.
            </p>
            <label className="mt-5 block text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              Organization
              <input
                required
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-medium tracking-normal text-neutral-950 outline-none"
              />
            </label>
            <label className="mt-4 block text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              Contact email
              <input
                required
                type="email"
                value={orgEmail}
                onChange={(event) => setOrgEmail(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-medium tracking-normal text-neutral-950 outline-none"
              />
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setInviteOpen(false)}
                className="h-10 rounded-full px-4 text-[11px] font-bold tracking-[0.12em] uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
              >
                Send invite
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function AccountRow({
  row,
  onApprove,
}: {
  row: AdminAccount;
  onApprove: () => void;
}) {
  const pending = row.status === "pending";
  const pct = row.total ? Math.round((row.done / row.total) * 100) : 0;
  return (
    <tr className="border-b border-neutral-100 last:border-0">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-bold">
            {initials(row.name)}
          </span>
          <span className="font-semibold">{row.name}</span>
        </div>
      </td>
      <td className="px-5 py-4 text-neutral-500">{typeLabel(row.kind)}</td>
      <td className="px-5 py-4 font-medium">{row.course}</td>
      <td className="px-5 py-4">
        <p className="text-[13px] text-neutral-500">
          Completed: {row.done}/{row.total}
        </p>
        <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
      </td>
      <td className="px-5 py-4">
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.08em]",
            pending ? "bg-neutral-100 text-neutral-600" : "bg-emerald-50 text-emerald-700"
          )}
        >
          {pending ? "Pending Approval" : "Active"}
        </span>
      </td>
      <td className="px-5 py-4 text-right">
        {pending ? (
          <button
            type="button"
            onClick={onApprove}
            className="inline-flex h-9 items-center rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
          >
            Approve
          </button>
        ) : (
          <Link
            href={`/admin/users/${row.id}`}
            className="inline-flex h-9 items-center rounded-full bg-neutral-100 px-4 text-[11px] font-bold tracking-[0.12em] uppercase"
          >
            View
          </Link>
        )}
      </td>
    </tr>
  );
}

function typeLabel(kind: AccountKind) {
  return kind === "organisation" ? "Organization" : "Individual";
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}
