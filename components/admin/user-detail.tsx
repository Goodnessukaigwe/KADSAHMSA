"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clock, Mail } from "lucide-react";

import { revokeCertificate } from "@/lib/certificates/actions";
import type {
  StaffCertificate,
  StaffLearnerLearning,
  StaffLearnerRow,
} from "@/lib/certificates/queries";
import { staffEnrolLearner } from "@/lib/courses/actions";
import type { AssignableCourse } from "@/lib/courses/types";
import { assignLearnerToOrg, setLearnerStaffRoles } from "@/lib/org/actions";
import type { LearnerOrgMembership, OrgOption } from "@/lib/org/types";
import { cn } from "@/lib/utils";

export function UserDetail({
  learner,
  certificates = [],
  learning = { enrolments: [], activity: [] },
  courses = [],
  organisations = [],
  memberships = [],
  learnerRoles = ["learner"],
  viewerIsSuperAdmin = false,
}: {
  learner: StaffLearnerRow;
  certificates?: StaffCertificate[];
  learning?: StaffLearnerLearning;
  courses?: AssignableCourse[];
  organisations?: OrgOption[];
  memberships?: LearnerOrgMembership[];
  learnerRoles?: string[];
  viewerIsSuperAdmin?: boolean;
}) {
  const router = useRouter();
  const [certs, setCerts] = useState(certificates);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [enrolSlug, setEnrolSlug] = useState(courses[0]?.slug ?? "");
  const [enrolMessage, setEnrolMessage] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [orgId, setOrgId] = useState(organisations[0]?.id ?? "");
  const [orgMessage, setOrgMessage] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [contentAdmin, setContentAdmin] = useState(learnerRoles.includes("content_admin"));
  const [superAdmin, setSuperAdmin] = useState(learnerRoles.includes("super_admin"));
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const [savingRoles, setSavingRoles] = useState(false);

  const primary = primaryEnrolment(learning);
  const otherEnrolments = learning.enrolments.filter((item) => item.slug !== primary?.slug);
  const pct = primary?.percent ?? 0;
  const done = primary?.completed ?? 0;
  const total = primary?.total ?? 0;
  const courseTitle = primary?.title ?? "No enrolment";
  const courseCert =
    certificates.find((cert) => primary && cert.title === primary.title) ??
    (certificates.length === 1 ? certificates[0] : null);

  async function enrol(event: React.FormEvent) {
    event.preventDefault();
    if (!enrolSlug || enrolling) return;
    setEnrolling(true);
    setEnrolMessage(null);
    const result = await staffEnrolLearner(learner.id, enrolSlug);
    setEnrolling(false);
    if (!result.ok) {
      setEnrolMessage(result.error);
      return;
    }
    setEnrolMessage("Learner enrolled.");
    router.refresh();
  }

  return (
    <div className="pb-16">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase hover:text-neutral-950"
      >
        <ArrowLeft className="size-3.5" />
        Back to learners
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-lg font-bold text-emerald-800">
            {initials(learner.name)}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">{learner.name}</h1>
              <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-[0.08em] text-emerald-700">
                Active
              </span>
            </div>
            <p className="mt-1 text-sm text-neutral-400">
              {learner.organisationName
                ? `${learner.organisationName} · Joined ${learner.joined}`
                : `Individual learner · Joined ${learner.joined}`}
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={(event) => void enrol(event)}
        className="mt-6 flex flex-wrap items-end gap-2 rounded-[24px] bg-white p-5"
      >
        <label className="min-w-[220px] flex-1 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          Enrol on course
          <select
            value={enrolSlug}
            onChange={(event) => setEnrolSlug(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium tracking-normal text-neutral-950 outline-none"
          >
            {courses.length === 0 ? (
              <option value="">No courses yet</option>
            ) : (
              courses.map((course) => (
                <option key={course.slug} value={course.slug}>
                  {course.title}
                  {course.status === "draft" ? " (draft)" : ""}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="submit"
          disabled={!enrolSlug || enrolling}
          className="h-11 rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
        >
          {enrolling ? "Enrolling…" : "Enrol"}
        </button>
        {enrolMessage ? (
          <p className="w-full text-sm text-neutral-500">{enrolMessage}</p>
        ) : null}
      </form>

      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!orgId || assigning) return;
          setAssigning(true);
          setOrgMessage(null);
          const result = await assignLearnerToOrg(learner.id, orgId);
          setAssigning(false);
          if (!result.ok) {
            setOrgMessage(result.error);
            return;
          }
          setOrgMessage("Learner assigned to the organisation.");
          router.refresh();
        }}
        className="mt-3 flex flex-wrap items-end gap-2 rounded-[24px] bg-white p-5"
      >
        <label className="min-w-[220px] flex-1 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          Assign to organisation
          <select
            value={orgId}
            onChange={(event) => setOrgId(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium tracking-normal text-neutral-950 outline-none"
          >
            {organisations.length === 0 ? (
              <option value="">No organisations yet</option>
            ) : (
              organisations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                  {org.status !== "approved" ? ` (${org.status})` : ""}
                </option>
              ))
            )}
          </select>
        </label>
        <button
          type="submit"
          disabled={!orgId || assigning}
          className="h-11 rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
        >
          {assigning ? "Assigning…" : "Assign"}
        </button>
        {memberships.length > 0 ? (
          <p className="w-full text-sm text-neutral-500">
            Current: {memberships.map((item) => `${item.name} (${item.role})`).join(", ")}
          </p>
        ) : null}
        {orgMessage ? <p className="w-full text-sm text-neutral-500">{orgMessage}</p> : null}
      </form>

      {viewerIsSuperAdmin ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (savingRoles) return;
            setSavingRoles(true);
            setRoleMessage(null);
            const result = await setLearnerStaffRoles(learner.id, {
              contentAdmin,
              superAdmin,
            });
            setSavingRoles(false);
            if (!result.ok) {
              setRoleMessage(result.error);
              return;
            }
            setRoleMessage("Staff roles saved.");
            router.refresh();
          }}
          className="mt-3 rounded-[24px] bg-white p-5"
        >
          <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Staff roles
          </p>
          <p className="mt-1 text-sm text-neutral-400">
            Super admin only. Organisation admin is set from the organisation members table.
          </p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={contentAdmin}
                onChange={(event) => setContentAdmin(event.target.checked)}
              />
              Content admin
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={superAdmin}
                onChange={(event) => setSuperAdmin(event.target.checked)}
              />
              Super admin
            </label>
          </div>
          <button
            type="submit"
            disabled={savingRoles}
            className="mt-4 h-10 rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
          >
            {savingRoles ? "Saving…" : "Save roles"}
          </button>
          {roleMessage ? <p className="mt-3 text-sm text-neutral-500">{roleMessage}</p> : null}
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
              {learner.email || "—"}
            </li>
          </ul>
        </article>
        <article className="rounded-[24px] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Course progress
          </p>
          {!primary ? (
            <>
              <p className="mt-4 text-4xl font-bold">—</p>
              <p className="mt-3 text-sm text-neutral-400">No enrolment on file.</p>
            </>
          ) : (
            <>
              <p className="mt-4 text-4xl font-bold">{pct}%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-3 text-sm text-neutral-400">
                {done} of {total} modules completed
              </p>
            </>
          )}
          {otherEnrolments.length > 0 ? (
            <ul className="mt-4 space-y-1.5 border-t border-neutral-100 pt-3">
              {otherEnrolments.map((item) => (
                <li key={item.slug} className="text-sm text-neutral-500">
                  {item.title} · {item.completed}/{item.total}
                </li>
              ))}
            </ul>
          ) : null}
        </article>
        <article className="rounded-[24px] bg-white p-5">
          <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Current course
          </p>
          <p className="mt-4 text-lg font-bold">{courseTitle}</p>
          <p className="mt-1 text-sm text-neutral-400">
            {!primary
              ? "This account has not enrolled yet."
              : courseCert?.status === "valid"
                ? "Certificate issued"
                : courseCert?.status === "revoked"
                  ? "Certificate revoked"
                  : "No certificate issued yet"}
          </p>
        </article>
      </div>

      <section className="mt-8 rounded-[24px] bg-white p-5">
        <h2 className="text-lg font-bold">Learning activity</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Enrolment, quiz attempts, and certificates on this account.
        </p>
        {learning.activity.length === 0 ? (
          <p className="mt-6 text-sm text-neutral-400">
            No learning activity recorded yet.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {learning.activity.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex size-8 items-center justify-center rounded-full",
                    item.tone === "approved"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-neutral-100 text-neutral-600"
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
        )}
      </section>

      {certs.length > 0 ? (
        <section className="mt-8 rounded-[24px] bg-white p-5">
          <h2 className="text-lg font-bold">Certificates</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Revoking keeps the PDF downloadable. Public verify will show revoked.
          </p>
          {revokeError ? (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {revokeError}
            </p>
          ) : null}
          <ul className="mt-5 space-y-4">
            {certs.map((cert) => (
              <li
                key={cert.id}
                className="flex flex-col gap-3 border-b border-neutral-100 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{cert.title}</p>
                  <p className="mt-0.5 text-sm text-neutral-400">
                    {cert.verificationId} · {cert.issued} · {cert.status}
                  </p>
                </div>
                {cert.status === "valid" ? (
                  revokeId === cert.id ? (
                    <form
                      className="flex w-full flex-col gap-2 sm:max-w-sm"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        setRevoking(true);
                        setRevokeError(null);
                        const result = await revokeCertificate(cert.id, revokeReason);
                        setRevoking(false);
                        if (!result.ok) {
                          setRevokeError(result.error);
                          return;
                        }
                        setCerts((current) =>
                          current.map((item) =>
                            item.id === cert.id ? { ...item, status: "revoked" } : item
                          )
                        );
                        setRevokeId(null);
                        setRevokeReason("");
                      }}
                    >
                      <input
                        required
                        minLength={3}
                        value={revokeReason}
                        onChange={(event) => setRevokeReason(event.target.value)}
                        placeholder="Reason for revocation"
                        className="h-10 rounded-xl border border-neutral-200 px-3 text-sm outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setRevokeId(null);
                            setRevokeReason("");
                          }}
                          className="h-9 rounded-full px-3 text-[11px] font-bold tracking-[0.12em] uppercase"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={revoking}
                          className="h-9 rounded-full bg-red-600 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
                        >
                          {revoking ? "Revoking…" : "Confirm revoke"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRevokeId(cert.id)}
                      className="h-9 rounded-full bg-red-50 px-4 text-[11px] font-bold tracking-[0.12em] text-red-700 uppercase"
                    >
                      Revoke
                    </button>
                  )
                ) : (
                  <span className="text-[11px] font-bold tracking-[0.12em] text-neutral-400 uppercase">
                    Revoked
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function primaryEnrolment(learning: StaffLearnerLearning) {
  return (
    learning.enrolments.find((item) => item.slug === "dptc") ??
    learning.enrolments[0] ??
    null
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
