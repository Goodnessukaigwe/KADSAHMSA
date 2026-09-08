"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { staffEnrolLearner } from "@/lib/courses/actions";
import type { CourseLearnerRow } from "@/lib/courses/types";

export function CourseLearners({
  courseSlug,
  learners,
}: {
  courseSlug: string;
  learners: CourseLearnerRow[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function enrol(userId: string) {
    if (pendingId) return;
    setPendingId(userId);
    setMessage(null);
    const result = await staffEnrolLearner(userId, courseSlug);
    setPendingId(null);
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage("Learner enrolled.");
    router.refresh();
  }

  return (
    <section className="mt-8 overflow-hidden rounded-[24px] bg-white">
      <div className="px-5 pt-5">
        <h2 className="text-lg font-bold">Learners</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Pending requests first. Enrol creates a seat and lets them start.
        </p>
        {message ? <p className="mt-3 text-sm text-neutral-500">{message}</p> : null}
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              <th className="px-5 py-3 font-bold">Name</th>
              <th className="px-2 py-3 font-bold">Email</th>
              <th className="px-2 py-3 font-bold">Progress</th>
              <th className="px-5 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {learners.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-sm text-neutral-400">
                  No registered learners yet.
                </td>
              </tr>
            ) : (
              learners.map((learner) => (
                <tr key={learner.id} className="border-b border-neutral-100 last:border-0">
                  <td className="px-5 py-4 font-medium">{learner.name}</td>
                  <td className="px-2 py-4 text-neutral-500">{learner.email || "—"}</td>
                  <td className="px-2 py-4 text-neutral-500">
                    {learner.enrolled
                      ? `${learner.completed}/${learner.total || 0} lessons`
                      : "—"}
                  </td>
                  <td className="px-5 py-4">
                    {learner.enrolled ? (
                      <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-emerald-700 uppercase">
                        Enrolled
                      </span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        {learner.requested ? (
                          <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-amber-800 uppercase">
                            Requested
                          </span>
                        ) : null}
                        <button
                          type="button"
                          disabled={pendingId !== null}
                          onClick={() => void enrol(learner.id)}
                          className="h-9 rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
                        >
                          {pendingId === learner.id ? "Enrolling…" : "Enrol"}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
