"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import {
  createInvite,
  bulkImportMembers,
  addMemberByEmail,
} from "@/lib/org/actions";
import { downloadCsv, parseMemberCsv, toCsv } from "@/lib/org/csv";
import type { OrgInviteRow } from "@/lib/org/types";

export function OrgEnrolTools({
  organisationId,
  courses,
  invites,
}: {
  organisationId: string;
  courses: { id: string; slug: string; title: string }[];
  invites: OrgInviteRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [asAdmin, setAsAdmin] = useState(false);
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [inviteCourseId, setInviteCourseId] = useState("");
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  const [csvCourse, setCsvCourse] = useState(courses[0]?.slug ?? "");
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    if (adding) return;
    setAdding(true);
    setAddMessage(null);
    const result = await addMemberByEmail(organisationId, email, asAdmin);
    setAdding(false);
    if (!result.ok) {
      setAddMessage(result.error);
      return;
    }
    setEmail("");
    setAddMessage("Member added.");
    router.refresh();
  }

  async function makeInvite(event: React.FormEvent) {
    event.preventDefault();
    if (inviting) return;
    setInviting(true);
    setInviteMessage(null);
    setInviteCode(null);
    const result = await createInvite(organisationId, inviteCourseId, 100);
    setInviting(false);
    if (!result.ok) {
      setInviteMessage(result.error);
      return;
    }
    setInviteCode(result.code);
    router.refresh();
  }

  async function importCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || importing) return;
    setImporting(true);
    setCsvMessage(null);
    const text = await file.text();
    const parsed = parseMemberCsv(text);
    if (parsed.error) {
      setCsvMessage(parsed.error);
      setImporting(false);
      return;
    }
    const result = await bulkImportMembers(organisationId, csvCourse, parsed.rows);
    setImporting(false);
    if (!result.ok) {
      setCsvMessage(result.error);
      return;
    }
    const parts = [
      result.created ? `${result.created} created` : null,
      result.joined ? `${result.joined} joined` : null,
      result.enrolled ? `${result.enrolled} enrolled` : null,
      result.skipped ? `${result.skipped} already members` : null,
    ].filter(Boolean);
    const extra = result.errors.length ? ` ${result.errors.slice(0, 5).join(" ")}` : "";
    setCsvMessage(`${parts.join(", ") || "Nothing to change."}.${extra}`);
    router.refresh();
  }

  const joinPath = inviteCode ? `/join?code=${inviteCode}` : "";

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <form onSubmit={(event) => void addMember(event)} className="rounded-[24px] bg-white p-5">
        <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          Add by email
        </p>
        <p className="mt-1 text-sm text-neutral-400">
          The learner must already have an account.
        </p>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@organisation.ng"
          className="mt-4 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm outline-none"
        />
        <label className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
          <input
            type="checkbox"
            checked={asAdmin}
            onChange={(event) => setAsAdmin(event.target.checked)}
          />
          Make organisation admin
        </label>
        <button
          type="submit"
          disabled={adding}
          className="mt-4 h-10 rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add member"}
        </button>
        {addMessage ? <p className="mt-3 text-sm text-neutral-500">{addMessage}</p> : null}
      </form>

      <form onSubmit={(event) => void makeInvite(event)} className="rounded-[24px] bg-white p-5">
        <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          Invite code
        </p>
        <p className="mt-1 text-sm text-neutral-400">
          Logged-in learners redeem at /join. Uses a seat.
        </p>
        <select
          value={inviteCourseId}
          onChange={(event) => setInviteCourseId(event.target.value)}
          className="mt-4 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
        >
          <option value="">No auto-enrol</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={inviting}
          className="mt-4 h-10 rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
        >
          {inviting ? "Creating…" : "Create invite"}
        </button>
        {inviteCode ? (
          <p className="mt-3 break-all text-sm font-semibold">
            {inviteCode}
            <span className="mt-1 block font-normal text-neutral-400">{joinPath}</span>
          </p>
        ) : null}
        {inviteMessage ? <p className="mt-3 text-sm text-neutral-500">{inviteMessage}</p> : null}
        {invites.length > 0 ? (
          <ul className="mt-4 space-y-1 text-[13px] text-neutral-500">
            {invites.slice(0, 3).map((invite) => (
              <li key={invite.id}>
                {invite.code} · {invite.uses}
                {invite.maxUses != null ? `/${invite.maxUses}` : ""} uses
              </li>
            ))}
          </ul>
        ) : null}
      </form>

      <div className="rounded-[24px] bg-white p-5">
        <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          CSV bulk enrol
        </p>
        <p className="mt-1 text-sm text-neutral-400">
          Columns: email, full_name. Up to 200 rows. Missing emails are created.
        </p>
        <select
          value={csvCourse}
          onChange={(event) => setCsvCourse(event.target.value)}
          className="mt-4 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"
        >
          {courses.length === 0 ? (
            <option value="">No published courses</option>
          ) : (
            courses.map((course) => (
              <option key={course.slug} value={course.slug}>
                {course.title}
              </option>
            ))
          )}
        </select>
        <div className="mt-4 flex flex-wrap gap-2">
          <label className="inline-flex h-10 cursor-pointer items-center rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase">
            {importing ? "Importing…" : "Upload CSV"}
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={importing || !csvCourse}
              onChange={(event) => void importCsv(event)}
            />
          </label>
          <button
            type="button"
            onClick={() =>
              downloadCsv(
                "organisation-members-template.csv",
                toCsv(["email", "full_name"], [["ada@example.com", "Ada Example"]])
              )
            }
            className="h-10 rounded-full bg-neutral-100 px-4 text-[11px] font-bold tracking-[0.12em] uppercase"
          >
            Template
          </button>
        </div>
        {csvMessage ? <p className="mt-3 text-sm text-neutral-500">{csvMessage}</p> : null}
      </div>
    </div>
  );
}
