"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { SplitCta } from "@/components/landing/split-cta";
import {
  quizResultsCopy,
  returningQuizResults,
  returningQuizStats,
} from "@/lib/content/quiz-results";
import { isReturningLearner } from "@/lib/learner-session";
import { cn } from "@/lib/utils";

export function QuizResults() {
  const [returning, setReturning] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReturning(isReturningLearner());
    setReady(true);
  }, []);

  if (!ready) return <div className="min-h-[40vh]" />;

  const stats = returning
    ? returningQuizStats
    : { taken: 0, passed: 0, retry: 0, average: 0 };
  const rows = returning ? returningQuizResults : [];

  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {quizResultsCopy.title}
      </h1>
      <p className="mt-2 text-sm text-neutral-400">{quizResultsCopy.subtitle}</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [String(stats.taken), "Quizzes taken"],
          [String(stats.passed), "Passed"],
          [String(stats.retry), "Need a retry"],
          [`${stats.average}%`, "Average score"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl bg-white px-5 py-4">
            <p className="text-2xl font-bold">
              {value}{" "}
              <span className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                {label}
              </span>
            </p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 max-w-lg rounded-[28px] bg-white px-8 py-12">
          <h2 className="text-xl font-bold">No quizzes yet</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Start with the Module 1 quiz after the DPTC introduction. The pass
            mark is 70%.
          </p>
          <div className="mt-6">
            <SplitCta href="/learn/dptc/quiz" size="sm">
              Start module 1 quiz
            </SplitCta>
          </div>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-[24px] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                  <th className="px-5 py-4 font-bold">Course</th>
                  <th className="px-5 py-4 font-bold">Assessment</th>
                  <th className="px-5 py-4 font-bold">Score</th>
                  <th className="px-5 py-4 font-bold">Attempts</th>
                  <th className="px-5 py-4 font-bold">Date</th>
                  <th className="px-5 py-4 font-bold">
                    <span className="sr-only">Status</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-5 py-4 font-medium">{row.course}</td>
                    <td className="px-5 py-4 text-neutral-600">
                      <Link href={row.href} className="hover:text-neutral-950 hover:underline">
                        {row.assessment}
                      </Link>
                    </td>
                    <td className="px-5 py-4 tabular-nums">{row.score}%</td>
                    <td className="px-5 py-4 tabular-nums text-neutral-500">
                      {row.attemptsUsed} of {row.maxAttempts}
                    </td>
                    <td className="px-5 py-4 text-neutral-500">{row.date}</td>
                    <td className="px-5 py-4 text-right">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.12em] uppercase",
                          row.status === "Active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-red-50 text-red-600"
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
