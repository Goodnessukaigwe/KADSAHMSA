"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { SplitCta } from "@/components/landing/split-cta";
import { PlayPoster, ProgressTrack } from "@/components/learner/simulated-video";
import type { PublishedCourse } from "@/lib/courses/types";
import { lessonPlayerHref } from "@/lib/courses/paths";
import { dptcCourse, dptcModules, moduleHref } from "@/lib/content/dptc";
import { DEFAULT_PASS_MARK } from "@/lib/domain";
import { type CourseProgress } from "@/lib/learning/progress";

export function CourseOverview({
  slug,
  course,
  enrolled,
  progress,
}: {
  slug: string;
  course: PublishedCourse;
  enrolled: boolean;
  progress: CourseProgress;
}) {
  const router = useRouter();
  const isDptc = slug === dptcCourse.slug;
  const hasFinal = course.hasFinalQuiz;
  const title = course.title;
  const summary = course.summary || (isDptc ? dptcCourse.description : "");
  const outline =
    course.outline.length
      ? course.outline
      : isDptc
        ? dptcModules.map((module) => ({
            slug: module.slug,
            title: module.title,
            position: module.index,
            durationLabel: `${module.minutes} min`,
          }))
        : [];
  const firstHref = outline[0]
    ? lessonPlayerHref(slug, outline[0].slug)
    : `/learn/${slug}`;

  function go() {
    router.push(firstHref);
  }

  return (
    <div className="relative pb-16 lg:pr-[300px]">
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-neutral-200 px-3 py-1 text-[11px] font-semibold text-neutral-700">
          {isDptc ? dptcCourse.audience : "Community"}
        </span>
        <span className="rounded-full bg-neutral-200 px-3 py-1 text-[11px] font-semibold text-neutral-700">
          Free
        </span>
      </div>

      <div className="mt-4">
        <PlayPoster src={course.image} title={title} onPlay={go} />
      </div>

      <h1 className="mt-6 max-w-3xl text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-neutral-500">
        {summary}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [String(outline.length || (isDptc ? dptcModules.length : 0)), isDptc ? "Modules" : "Lessons"],
          [course.durationLabel || (isDptc ? dptcCourse.durationHours : "Self-paced"), "Duration"],
          [hasFinal ? `${DEFAULT_PASS_MARK}%` : "—", "Pass mark"],
          ["Free", "Access"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-2xl bg-white px-5 py-4 shadow-sm">
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
          {outline.map((lesson) => {
            const finished = progress.completed.includes(lesson.position);
            const current = progress.currentModule === lesson.position;
            const pct = finished ? 100 : current ? 42 : 0;
            const href = isDptc
              ? moduleHref(slug, lesson.slug)
              : lessonPlayerHref(slug, lesson.slug);
            return (
              <Link
                key={lesson.slug}
                href={href}
                className="flex items-center gap-4 rounded-2xl bg-white px-4 py-4 transition-colors hover:bg-neutral-50"
              >
                <span className="w-10 shrink-0 text-2xl font-bold text-neutral-300">
                  {lesson.position}.
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold">{lesson.title}</h3>
                  <p className="mt-0.5 text-[13px] text-neutral-400">
                    {lesson.durationLabel || "Self-paced"}
                  </p>
                </div>
                <div className="hidden w-36 shrink-0 sm:block">
                  <p className="mb-1 text-right text-[11px] text-neutral-400">
                    {finished ? "Completed" : current ? "In progress" : "Not started"}
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
            ["Price", "Free"],
            ["Level", isDptc ? dptcCourse.level : "Introductory"],
            ["Access", isDptc ? dptcCourse.access : "Self-paced"],
            ["Certificate", hasFinal ? "Included" : "None"],
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
            {enrolled ? "Continue this course" : "Preview this course"}
          </SplitCta>
        </div>
      </aside>
    </div>
  );
}
