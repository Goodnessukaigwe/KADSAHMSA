"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { feedbackCopy } from "@/lib/content/feedback";
import { markFeedbackRead, markFeedbackResolved } from "@/lib/feedback/actions";
import type { FeedbackFilter, FeedbackTicket } from "@/lib/feedback/types";
import { cn } from "@/lib/utils";

const FILTERS: FeedbackFilter[] = ["all", "new", "open", "resolved"];

function formatWhen(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatStamp(iso: string | null) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function preview(message: string) {
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length > 80 ? `${compact.slice(0, 80)}…` : compact;
}

function matches(ticket: FeedbackTicket, filter: FeedbackFilter) {
  if (filter === "all") return true;
  if (filter === "new") return ticket.readAt === null;
  if (filter === "open") return ticket.status === "open";
  return ticket.status === "resolved";
}

export function AdminFeedback({ tickets }: { tickets: FeedbackTicket[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FeedbackFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rows, setRows] = useState(tickets);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(tickets);
  }, [tickets]);

  const visible = useMemo(
    () => rows.filter((ticket) => matches(ticket, filter)),
    [rows, filter]
  );
  const selected = rows.find((ticket) => ticket.id === selectedId) ?? null;

  function openTicket(ticket: FeedbackTicket) {
    setSelectedId(ticket.id);
    setActionError(null);
    if (ticket.readAt) return;
    startTransition(async () => {
      const result = await markFeedbackRead(ticket.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setRows((current) =>
        current.map((row) =>
          row.id === ticket.id ? { ...row, readAt: row.readAt ?? new Date().toISOString() } : row
        )
      );
      router.refresh();
    });
  }

  function resolveSelected() {
    if (!selected || selected.status === "resolved") return;
    startTransition(async () => {
      const result = await markFeedbackResolved(selected.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      const now = new Date().toISOString();
      setRows((current) =>
        current.map((row) =>
          row.id === selected.id
            ? { ...row, status: "resolved", resolvedAt: now, readAt: row.readAt ?? now }
            : row
        )
      );
      router.refresh();
    });
  }

  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {feedbackCopy.inboxTitle}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">{feedbackCopy.inboxSubcopy}</p>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "h-9 rounded-full px-4 text-[11px] font-bold tracking-[0.12em] uppercase",
              filter === value
                ? "bg-neutral-950 text-white"
                : "bg-neutral-200 text-neutral-800"
            )}
          >
            {feedbackCopy.filters[value]}
          </button>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-[24px] bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                <th className="px-5 py-4 font-bold">{feedbackCopy.columns.from}</th>
                <th className="px-5 py-4 font-bold">{feedbackCopy.columns.page}</th>
                <th className="px-5 py-4 font-bold">{feedbackCopy.columns.message}</th>
                <th className="px-5 py-4 font-bold">{feedbackCopy.columns.time}</th>
                <th className="px-5 py-4 font-bold">{feedbackCopy.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((ticket) => {
                const unread = ticket.readAt === null;
                const active = ticket.id === selectedId;
                return (
                  <tr
                    key={ticket.id}
                    className={cn(
                      "cursor-pointer border-b border-neutral-100 last:border-0",
                      active ? "bg-neutral-50" : "hover:bg-neutral-50/70",
                      unread ? "font-semibold" : ""
                    )}
                    onClick={() => openTicket(ticket)}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span>{ticket.submitterName}</span>
                        {unread ? (
                          <span className="rounded-full bg-[#0b4d2c] px-2 py-0.5 text-[9px] font-bold tracking-[0.12em] text-white uppercase">
                            {feedbackCopy.newBadge}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-neutral-500">
                      {ticket.pagePath}
                    </td>
                    <td className="px-5 py-4 text-neutral-500">{preview(ticket.message)}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-neutral-500">
                      {formatWhen(ticket.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase",
                          ticket.status === "resolved"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-800"
                        )}
                      >
                        {ticket.status === "resolved"
                          ? feedbackCopy.resolved
                          : feedbackCopy.open}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-sm text-neutral-400">{feedbackCopy.empty}</p>
        ) : null}
      </div>

      {selected ? (
        <div className="mt-6 rounded-[24px] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                {selected.submitterName}
              </p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">
                {feedbackCopy.categories[selected.category]}
              </h2>
            </div>
            {selected.status === "open" ? (
              <button
                type="button"
                onClick={resolveSelected}
                disabled={pending}
                className="h-9 rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
              >
                {pending ? feedbackCopy.resolving : feedbackCopy.markResolved}
              </button>
            ) : (
              <span className="inline-flex h-9 items-center rounded-full bg-emerald-50 px-4 text-[11px] font-bold tracking-[0.12em] text-emerald-700 uppercase">
                {feedbackCopy.resolved}
              </span>
            )}
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                {feedbackCopy.detailEmail}
              </dt>
              <dd className="mt-1 text-neutral-700">
                {selected.isAnonymous ? "—" : selected.submitterEmail || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                {feedbackCopy.detailPage}
              </dt>
              <dd className="mt-1 font-mono text-xs text-neutral-700">{selected.pagePath}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                {feedbackCopy.detailOpened}
              </dt>
              <dd className="mt-1 text-neutral-700">{formatStamp(selected.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                {feedbackCopy.detailRead}
              </dt>
              <dd className="mt-1 text-neutral-700">{formatStamp(selected.readAt)}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                {feedbackCopy.detailResolved}
              </dt>
              <dd className="mt-1 text-neutral-700">{formatStamp(selected.resolvedAt)}</dd>
            </div>
          </dl>

          <p className="mt-5 whitespace-pre-wrap text-[15px] leading-relaxed text-neutral-800">
            {selected.message}
          </p>
          {actionError ? <p className="mt-3 text-sm text-red-600">{actionError}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
