"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock,
  Download,
  Mail,
  MapPin,
  MoreHorizontal,
  Phone,
} from "lucide-react";

import {
  accountActivity,
  approveAdminAccount,
  getAdminAccount,
  percentComplete,
} from "@/lib/content/admin-users";
import { cn } from "@/lib/utils";

export function UserDetail({ id }: { id: string }) {
  const [account, setAccount] = useState(() => getAdminAccount(id));
  const [editing, setEditing] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);
  const [note, setNote] = useState("");

  if (!account) {
    return (
      <div className="pb-16">
        <p className="text-sm text-neutral-400">This account is not in the current session.</p>
        <Link href="/admin/users" className="mt-4 inline-block text-sm font-semibold underline">
          Back to users
        </Link>
      </div>
    );
  }

  const activity = accountActivity(account);
  const pct = percentComplete(account);
  const pending = account.status === "pending";
  const backHref =
    account.kind === "organisation" ? "/admin/users" : "/admin/users";
  const backLabel =
    account.kind === "organisation" ? "Back to organizations" : "Back to individuals";

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setAccount((current) =>
      current
        ? {
            ...current,
            name: String(data.get("name") || current.name),
            email: String(data.get("email") || current.email),
            phone: String(data.get("phone") || current.phone),
            location: String(data.get("location") || current.location),
          }
        : current
    );
    setEditing(false);
  }

  return (
    <div className="pb-16">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase hover:text-neutral-950"
      >
        <ArrowLeft className="size-3.5" />
        {backLabel}
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">
            {initials(account.name)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{account.name}</h1>
              <span
                className={cn(
                  "inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.08em]",
                  pending ? "bg-neutral-100 text-neutral-600" : "bg-emerald-50 text-emerald-700"
                )}
              >
                {pending ? "Pending Approval" : "Active"}
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-400">
              {account.kind === "organisation" ? "Organization" : "Individual learner"} · Joined{" "}
              {account.joined}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pending ? (
            <button
              type="button"
              onClick={() => {
                approveAdminAccount(account.id);
                setAccount(getAdminAccount(account.id));
              }}
              className="h-10 rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
            >
              Approve
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMessageOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-violet-50 px-4 text-[11px] font-bold tracking-[0.12em] text-violet-800 uppercase"
            >
              <Mail className="size-3.5" />
              Message
            </button>
          )}
          <button
            type="button"
            onClick={() => setEditing((open) => !open)}
            className="h-10 rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
          >
            Edit profile
          </button>
        </div>
      </div>

      {editing ? (
        <form
          onSubmit={saveProfile}
          className="mt-6 grid gap-3 rounded-[24px] bg-white p-5 sm:grid-cols-2"
        >
          <Field name="name" label="Name" defaultValue={account.name} />
          <Field name="email" label="Email" defaultValue={account.email} />
          <Field name="phone" label="Phone" defaultValue={account.phone} />
          <Field name="location" label="Location" defaultValue={account.location} />
          <div className="sm:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-9 rounded-full px-4 text-[11px] font-bold tracking-[0.12em] uppercase"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
            >
              Save
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-8 grid gap-3 lg:grid-cols-3">
        <article className="rounded-[24px] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Contact details
          </p>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center gap-2 text-neutral-600">
              <Mail className="size-4 text-neutral-400" />
              {account.email}
            </li>
            <li className="flex items-center gap-2 text-neutral-600">
              <Phone className="size-4 text-neutral-400" />
              {account.phone}
            </li>
            <li className="flex items-center gap-2 text-neutral-600">
              <MapPin className="size-4 text-neutral-400" />
              {account.location}
            </li>
          </ul>
        </article>
        <article className="rounded-[24px] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Course progress
          </p>
          <p className="mt-4 text-4xl font-bold">{pct}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-3 text-sm text-neutral-400">
            {account.done} of {account.total}{" "}
            {account.kind === "organisation" ? "seats" : "lessons"} completed
          </p>
        </article>
        <article className="rounded-[24px] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Current course
          </p>
          <p className="mt-4 text-lg font-bold">{account.course}</p>
          <p className="mt-1 text-sm text-neutral-400">Certificate included</p>
          <button
            type="button"
            onClick={() => {
              const blob = new Blob(
                [
                  `${account.name}\n${account.course}\nProgress: ${account.done}/${account.total} (${pct}%)\nStatus: ${account.status}\n`,
                ],
                { type: "text/plain" }
              );
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = `${account.id}-report.txt`;
              link.click();
              URL.revokeObjectURL(url);
            }}
            className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-neutral-500 hover:text-neutral-950"
          >
            <Download className="size-3.5" />
            Download report
          </button>
        </article>
      </div>

      <section className="mt-8 rounded-[24px] bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Learning activity</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Recent activity and course milestones.
            </p>
          </div>
          <button type="button" className="text-neutral-400" aria-label="More">
            <MoreHorizontal className="size-5" />
          </button>
        </div>
        <ul className="mt-6 space-y-4">
          {activity.map((item) => (
            <li key={item.id} className="flex items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 flex size-8 items-center justify-center rounded-full",
                  item.tone === "approved"
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-violet-50 text-violet-700"
                )}
              >
                {item.tone === "approved" ? (
                  <Check className="size-3.5" />
                ) : (
                  <Clock className="size-3.5" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-0.5 text-[13px] text-neutral-400">{item.when}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {messageOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <form
            className="w-full max-w-md rounded-[24px] bg-white p-6"
            onSubmit={(event) => {
              event.preventDefault();
              setNote("");
              setMessageOpen(false);
            }}
          >
            <h2 className="text-xl font-bold">Message {account.name}</h2>
            <textarea
              required
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={5}
              placeholder="Write a short note to this learner."
              className="mt-4 w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMessageOpen(false)}
                className="h-10 rounded-full px-4 text-[11px] font-bold tracking-[0.12em] uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: string;
}) {
  return (
    <label className="block text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
      {label}
      <input
        name={name}
        defaultValue={defaultValue}
        className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-medium tracking-normal text-neutral-950 outline-none"
      />
    </label>
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
