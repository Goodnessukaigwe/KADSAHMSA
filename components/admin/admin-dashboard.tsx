import Link from "next/link";

import { DayBars, Meter } from "@/components/admin/charts";
import type { Overview } from "@/lib/admin/analytics";
import type { RecentEnrolment } from "@/lib/courses/types";

function Kpi({
  value,
  label,
  note,
  href,
  alert = false,
}: {
  value: string;
  label: string;
  note?: string;
  href?: string;
  alert?: boolean;
}) {
  const body = (
    <div className={`h-full rounded-2xl px-5 py-5 ${alert ? "bg-neutral-950 text-white" : "bg-white"}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p
        className={`mt-1 text-[11px] font-bold tracking-[0.14em] uppercase ${alert ? "text-white/60" : "text-neutral-400"}`}
      >
        {label}
      </p>
      {note ? <p className={`mt-2 text-xs ${alert ? "text-white/70" : "text-neutral-500"}`}>{note}</p> : null}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:opacity-90">
      {body}
    </Link>
  ) : (
    body
  );
}

const H2 = "text-[11px] font-bold tracking-[0.16em] text-neutral-400 uppercase";

export function AdminDashboard({
  overview,
  recent,
}: {
  overview: Overview;
  recent: RecentEnrolment[];
}) {
  const o = overview;
  const plus = (n: number) => (n > 0 ? `+${n} this week` : "none this week");
  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Overview</h1>
      <p className="mt-2 text-sm text-neutral-400">How the Academy is doing, and what needs you.</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          value={String(o.chatsWaiting)}
          label="Chats waiting for a reply"
          note={o.chatsWaiting ? "Open the chat inbox" : "All caught up"}
          href="/admin/inbox"
          alert={o.chatsWaiting > 0}
        />
        <Kpi
          value={String(o.unreadTickets)}
          label="Unread feedback tickets"
          note={o.unreadTickets ? "Open Feedback" : "All caught up"}
          href="/admin/feedback"
          alert={o.unreadTickets > 0}
        />
        <Kpi value={String(o.learners)} label="Registered learners" note={plus(o.newLearners7d)} href="/admin/users" />
        <Kpi value={String(o.activeEnrolments)} label="Active enrolments" note={plus(o.newEnrolments7d)} />
        <Kpi value={`${o.completionRate}%`} label="Completion rate" note="Of active enrolments" />
        <Kpi value={String(o.certificates)} label="Certificates issued" />
        <Kpi value={`${o.passRate}%`} label="Quiz pass rate" note={`${o.attempts30d} attempts in 30 days`} />
        <Kpi value={`${o.averageScore}%`} label="Average quiz score" note="Last 30 days" />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[24px] bg-white p-5">
          <h2 className={H2}>New learners, last 30 days</h2>
          <div className="mt-4">
            <DayBars data={o.signups} label="New learners" />
          </div>
        </section>
        <section className="rounded-[24px] bg-white p-5">
          <h2 className={H2}>New enrolments, last 30 days</h2>
          <div className="mt-4">
            <DayBars data={o.enrolmentsPerDay} label="New enrolments" />
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className={H2}>Courses</h2>
        <div className="mt-4 overflow-hidden rounded-[24px] bg-white">
          {o.courses.length === 0 ? (
            <p className="px-5 py-10 text-sm text-neutral-400">No courses yet.</p>
          ) : (
            <ul>
              {o.courses.map((course) => (
                <li key={course.slug} className="border-b border-neutral-100 last:border-0">
                  <Link
                    href={`/admin/courses/${course.slug}/analytics`}
                    className="grid items-center gap-3 px-5 py-4 hover:bg-neutral-50 sm:grid-cols-[1fr_120px_160px_90px]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{course.title}</span>
                      <span className="text-xs text-neutral-400">{course.status}</span>
                    </span>
                    <span className="text-sm text-neutral-600">{course.enrolled} enrolled</span>
                    <span className="flex items-center gap-2 text-sm text-neutral-600">
                      <Meter percent={course.completionPercent} className="w-20" />
                      {course.completionPercent}% done
                    </span>
                    <span className="text-sm text-neutral-600">{course.certificates} certs</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className={H2}>Recent enrolments</h2>
            <Link href="/admin/users" className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-950">
              View all →
            </Link>
          </div>
          <div className="mt-4 overflow-hidden rounded-[24px] bg-white">
            {recent.length === 0 ? (
              <p className="px-5 py-10 text-sm text-neutral-400">No enrolments yet.</p>
            ) : (
              <ul>
                {recent.map((row, index) => (
                  <li
                    key={`${row.name}-${row.course}-${index}`}
                    className="flex items-center gap-3 border-b border-neutral-100 px-5 py-3.5 last:border-0"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold">
                      {row.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{row.name}</span>
                      <span className="block truncate text-xs text-neutral-400">{row.course}</span>
                    </span>
                    <span className="text-[13px] text-neutral-400">{row.when}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        <section>
          <h2 className={H2}>Recent certificates</h2>
          <div className="mt-4 overflow-hidden rounded-[24px] bg-white">
            {o.recentCertificates.length === 0 ? (
              <p className="px-5 py-10 text-sm text-neutral-400">No certificates yet.</p>
            ) : (
              <ul>
                {o.recentCertificates.map((row, index) => (
                  <li
                    key={`${row.name}-${index}`}
                    className="flex items-center gap-3 border-b border-neutral-100 px-5 py-3.5 last:border-0"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#c9a227]/20 text-sm font-bold text-[#7a5e00]">
                      {row.name.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{row.name}</span>
                      <span className="block truncate text-xs text-neutral-400">
                        {row.course} · {row.score}%
                      </span>
                    </span>
                    <span className="text-[13px] text-neutral-400">{row.when}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
