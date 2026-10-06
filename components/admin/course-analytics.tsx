import Link from "next/link";

import { Meter } from "@/components/admin/charts";
import type { CourseAnalytics } from "@/lib/admin/analytics";

const H2 = "text-[11px] font-bold tracking-[0.16em] text-neutral-400 uppercase";

export function CourseAnalyticsView({ analytics: a }: { analytics: CourseAnalytics }) {
  return (
    <div className="pb-16">
      <Link href="/admin" className="text-sm font-semibold text-neutral-500 hover:text-neutral-950">
        ← Overview
      </Link>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{a.title}</h1>
      <p className="mt-2 text-sm text-neutral-400">How learners are getting on in this course.</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [String(a.enrolled), "Enrolled"],
          [String(a.completed), "Completed all modules"],
          [`${a.averageProgress}%`, "Average progress"],
          [String(a.certificates), "Certificates issued"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl bg-white px-5 py-5">
            <p className="text-3xl font-bold">{value}</p>
            <p className="mt-1 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">{label}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 rounded-[24px] bg-white p-5">
        <h2 className={H2}>Where learners get to</h2>
        <p className="mt-1 text-sm text-neutral-500">
          The share of enrolled learners who have completed each module. A sharp drop shows where people stop.
        </p>
        {a.modules.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-400">No modules yet.</p>
        ) : (
          <ol className="mt-4 space-y-3">
            {a.modules.map((module) => (
              <li key={module.position} className="grid items-center gap-3 sm:grid-cols-[260px_1fr_90px]">
                <span className="min-w-0 truncate text-sm">
                  <span className="mr-2 font-bold text-neutral-400">{module.position}.</span>
                  {module.title}
                </span>
                <Meter percent={module.percent} />
                <span className="text-sm text-neutral-500">
                  {module.percent}% ({module.completed})
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-6 rounded-[24px] bg-white p-5">
        <h2 className={H2}>Quiz results</h2>
        {a.quizzes.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">No quiz attempts yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="text-[11px] tracking-[0.12em] text-neutral-400 uppercase">
                <tr>
                  <th className="py-2 font-bold">Quiz</th>
                  <th className="py-2 font-bold">Learners</th>
                  <th className="py-2 font-bold">Attempts</th>
                  <th className="py-2 font-bold">Pass rate</th>
                  <th className="py-2 font-bold">Average score</th>
                </tr>
              </thead>
              <tbody>
                {a.quizzes.map((quiz) => (
                  <tr key={quiz.label} className="border-t border-neutral-100">
                    <td className="py-2.5 font-semibold">{quiz.label}</td>
                    <td className="py-2.5">{quiz.learners}</td>
                    <td className="py-2.5">{quiz.attempts}</td>
                    <td className="py-2.5">{quiz.passRate}%</td>
                    <td className="py-2.5">{quiz.averageScore}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[24px] bg-white p-5">
          <h2 className={H2}>Stuck: no activity for a week</h2>
          {a.stuck.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-400">Nobody is stuck.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {a.stuck.map((row) => (
                <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
                  <Link href={`/admin/users/${row.id}`} className="min-w-0 truncate font-semibold hover:underline">
                    {row.name}
                    <span className="ml-2 font-normal text-neutral-400">{row.email}</span>
                  </Link>
                  <span className="shrink-0 text-xs text-neutral-500">
                    {row.percent}% · idle {row.idleDays}d
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-[24px] bg-white p-5">
          <h2 className={H2}>All learners</h2>
          {a.learners.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-400">Nobody is enrolled yet.</p>
          ) : (
            <ul className="mt-3 max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {a.learners.map((row, index) => (
                <li key={`${row.email}-${index}`} className="grid items-center gap-2 text-sm sm:grid-cols-[1fr_90px_130px]">
                  <span className="min-w-0 truncate">
                    <span className="font-semibold">{row.name}</span>
                    <span className="ml-2 text-neutral-400">{row.email}</span>
                  </span>
                  <Meter percent={row.percent} />
                  <span className="text-xs text-neutral-500">{row.percent}% · {row.lastActive}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
