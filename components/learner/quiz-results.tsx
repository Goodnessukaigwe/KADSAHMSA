import Link from "next/link";

import { SplitCta } from "@/components/landing/split-cta";
import { quizResultsCopy } from "@/lib/content/quiz-results";
import type { QuizResultsView } from "@/lib/quiz/queries";

function formatWhen(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function QuizResults({ view }: { view: QuizResultsView }) {
  const stats = [
    [String(view.taken), "Quizzes taken"],
    [String(view.passed), "Passed"],
    [String(view.retry), "Need a retry"],
    [`${view.average}%`, "Average score"],
  ] as const;

  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        {quizResultsCopy.title}
      </h1>
      <p className="mt-2 text-sm text-neutral-400">{quizResultsCopy.subtitle}</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(([value, label]) => (
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

      {view.attempts.length === 0 ? (
        <div className="mt-10 max-w-lg rounded-[28px] bg-white px-8 py-12">
          <h2 className="text-xl font-bold">No quizzes yet</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">
            Start with a course quiz from My courses. The pass mark is 70%. A
            certificate is issued only after every live lesson and a pass on the
            final assessment.
          </p>
          <div className="mt-6">
            <SplitCta href="/my/courses" size="sm">
              Go to My courses
            </SplitCta>
          </div>
        </div>
      ) : (
        <div className="mt-10 space-y-3">
          {view.attempts.map((attempt) => (
            <article
              key={attempt.id}
              className="flex flex-col gap-3 rounded-[24px] bg-white p-5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">{attempt.quizTitle}</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  Attempt {attempt.attemptNo} · {formatWhen(attempt.submittedAt)}
                </p>
              </div>
              <p className="text-lg font-bold tabular-nums">{attempt.scorePercent}%</p>
              <span
                className={
                  attempt.passed
                    ? "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-emerald-700 uppercase"
                    : "inline-flex rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-red-700 uppercase"
                }
              >
                {attempt.passed ? "Passed" : "Retry"}
              </span>
              <Link
                href={
                  attempt.quizSlug === "final"
                    ? `/learn/${attempt.courseSlug || "dptc"}/final`
                    : `/learn/${attempt.courseSlug || "dptc"}/quiz`
                }
                className="text-sm font-semibold text-neutral-600 hover:text-neutral-950"
              >
                Open quiz
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
