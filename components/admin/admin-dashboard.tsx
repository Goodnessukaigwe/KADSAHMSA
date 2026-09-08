import Link from "next/link";

import type { DashboardStat, RecentEnrolment } from "@/lib/courses/types";

export function AdminDashboard({
  stats,
  recent,
}: {
  stats: DashboardStat[];
  recent: RecentEnrolment[];
}) {
  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Welcome, admin
      </h1>
      <p className="mt-2 text-sm text-neutral-400">
        Here’s how the platform is doing today.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-white px-5 py-5">
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="mt-1 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[11px] font-bold tracking-[0.16em] text-neutral-400 uppercase">
            Recent enrolments
          </h2>
          <Link
            href="/admin/users"
            className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-950"
          >
            View all →
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-[24px] bg-white">
          {recent.length === 0 ? (
            <p className="px-5 py-10 text-sm text-neutral-400">
              No enrolments yet.
            </p>
          ) : (
            <ul>
              {recent.map((row, index) => (
                <li
                  key={`${row.name}-${row.course}-${index}`}
                  className="flex items-center gap-4 border-b border-neutral-100 px-5 py-4 last:border-0"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold">
                    {row.name.charAt(0)}
                  </span>
                  <p className="min-w-0 flex-1 font-semibold">{row.name}</p>
                  <p className="hidden text-sm text-neutral-500 sm:block">
                    {row.course}
                  </p>
                  <p className="text-[13px] text-neutral-400">{row.when}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
