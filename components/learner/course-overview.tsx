"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SplitCta } from "@/components/landing/split-cta";
import { PlayPoster, ProgressTrack } from "@/components/learner/simulated-video";
import { dptcCourse, dptcModules, moduleHref } from "@/lib/content/dptc";
import { enrolInCourse } from "@/lib/learning/actions";
import {
  continueHref,
  emptyProgress,
  type CourseProgress,
} from "@/lib/learning/progress";

export function CourseOverview({
  slug,
  enrolled,
  progress,
}: {
  slug: string;
  enrolled: boolean;
  progress: CourseProgress;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const continueTo = continueHref(slug, enrolled ? progress : emptyProgress());

  async function go() {
    if (pending) return;
    if (enrolled) {
      router.push(continueTo);
      return;
    }
    setError(null);
    setPending(true);
    const result = await enrolInCourse(slug);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push(continueHref(slug, emptyProgress()));
    router.refresh();
  }

  return (
    <div className="relative pb-16 lg:pr-[300px]">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-neutral-200 px-3 py-1 text-[11px] font-semibold text-neutral-700">
          {dptcCourse.audience}
        </span>
        <span className="rounded-full bg-neutral-200 px-3 py-1 text-[11px] font-semibold text-neutral-700">
          {dptcCourse.price}
        </span>
      </div>

      <div className="mt-4">
        <PlayPoster src={dptcCourse.hero} onPlay={go} />
      </div>

      <h1 className="mt-6 max-w-3xl text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
        {dptcCourse.title}
      </h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-neutral-500">
        {dptcCourse.description}
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [String(dptcModules.length), "Modules"],
          [dptcCourse.durationHours, "Duration"],
          [`${dptcCourse.passMark}%`, "Pass mark"],
          [dptcCourse.enrolledCount, "Enrolled"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="rounded-2xl bg-white px-5 py-4 shadow-sm"
          >
            <p className="text-2xl font-bold">{value}</p>
            <p className="mt-1 text-[11px] font-semibold tracking-[0.14em] text-neutral-400 uppercase">
              {label}
            </p>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-[11px] font-bold tracking-[0.16em] text-neutral-400 uppercase">
          Course outline
        </h2>
        <div className="mt-4 space-y-2">
          {dptcModules.map((module) => {
            const finished = progress.completed.includes(module.index);
            const current = progress.currentModule === module.index;
            const pct = finished ? 100 : current ? 42 : 0;
            const done = Math.round((pct / 100) * module.slides);
            return (
              <Link
                key={module.slug}
                href={enrolled ? moduleHref(dptcCourse.slug, module.slug) : "#"}
                onClick={(event) => {
                  if (!enrolled) {
                    event.preventDefault();
                    void go();
                  }
                }}
                className="flex items-center gap-4 rounded-2xl bg-white px-4 py-4 transition-colors hover:bg-neutral-50"
              >
                <span className="w-10 shrink-0 text-2xl font-bold text-neutral-300">
                  {module.index}.
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold">{module.title}</h3>
                  <p className="mt-0.5 text-[13px] text-neutral-400">
                    {module.slides} slides · {module.minutes} min read · {module.quizzes} quiz
                  </p>
                </div>
                <div className="hidden w-36 shrink-0 sm:block">
                  <p className="mb-1 text-right text-[11px] text-neutral-400">
                    Completed: {done}/{module.slides}
                  </p>
                  <ProgressTrack value={pct} tone={finished ? "complete" : "default"} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <aside className="mt-8 rounded-[24px] bg-neutral-950 p-6 text-white lg:absolute lg:top-0 lg:right-0 lg:mt-0 lg:w-[280px]">
        <dl className="space-y-4 text-sm">
          {[
            ["Price", dptcCourse.price],
            ["Level", dptcCourse.level],
            ["Access", dptcCourse.access],
            ["Certificate", dptcCourse.certificate],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3">
              <dt className="text-[11px] tracking-[0.14em] text-white/45 uppercase">
                {label}
              </dt>
              <dd className="font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8">
          <SplitCta variant="light" className="w-full" onClick={go}>
            {pending
              ? "Enrolling…"
              : enrolled
                ? "Continue this course"
                : "Enroll for this course"}
          </SplitCta>
        </div>
      </aside>
    </div>
  );
}
