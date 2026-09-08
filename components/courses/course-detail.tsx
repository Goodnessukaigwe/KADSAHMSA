"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { CourseCover } from "@/components/courses/course-cover";
import { SplitCta } from "@/components/landing/split-cta";
import { ProgressTrack } from "@/components/learner/simulated-video";
import type { PublishedCourse } from "@/lib/courses/types";
import { lessonPlayerHref } from "@/lib/courses/paths";
import { dptcCourse } from "@/lib/content/dptc";
import { DEFAULT_PASS_MARK } from "@/lib/domain";
import { dashboardCopy } from "@/lib/content/dashboard";
import { requestEnrolment } from "@/lib/learning/actions";
import { type CourseProgress } from "@/lib/learning/progress";

export function CourseDetail({
  course,
  signedIn,
  enrolled,
  requested,
  progress,
}: {
  course: PublishedCourse;
  signedIn: boolean;
  enrolled: boolean;
  requested: boolean;
  progress: CourseProgress;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [asked, setAsked] = useState(requested);
  const isDptc = course.slug === dptcCourse.slug;
  const waiting = asked || requested;
  const firstHref =
    course.outline[0]
      ? lessonPlayerHref(course.slug, course.outline[0].slug)
      : `/learn/${course.slug}`;

  async function enroll() {
    if (!signedIn) {
      router.push("/register");
      return;
    }
    if (pending) return;
    if (enrolled) {
      router.push(firstHref);
      return;
    }
    if (waiting) return;
    setError(null);
    setPending(true);
    const result = await requestEnrolment(course.slug);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    setAsked(true);
    setPending(false);
    router.refresh();
  }

  return (
    <div className="bg-white px-4 py-10 font-sans text-neutral-950 sm:px-6 sm:py-14">
      <div className="relative mx-auto max-w-[1120px] pb-8 lg:pr-[300px]">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-neutral-200 px-3 py-1 text-[11px] font-semibold text-neutral-700">
            {isDptc ? dptcCourse.level : "Introductory"}
          </span>
          <span className="rounded-full bg-neutral-200 px-3 py-1 text-[11px] font-semibold text-neutral-700">
            Free
          </span>
        </div>

        <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl">
          <CourseCover
            src={course.image}
            title={course.title}
            priority
            sizes="(max-width: 1024px) 100vw, 800px"
          />
        </div>

        <h1 className="mt-6 max-w-3xl text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          {course.title}
        </h1>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-neutral-500">
          {course.summary ||
            (isDptc
              ? dptcCourse.description
              : "A KADSAMHSA course. Request enrolment to read the published lessons.")}
        </p>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              [String(course.lessons || course.outline.length), isDptc ? "Modules" : "Lessons"],
              [course.durationLabel || (isDptc ? dptcCourse.durationHours : "Self-paced"), "Duration"],
              [course.hasFinalQuiz ? `${DEFAULT_PASS_MARK}%` : "—", "Pass mark"],
              ["Free", "Access"],
            ] as const
          ).map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-[#f7f7f7] px-5 py-4">
              <p className="text-2xl font-bold">{value}</p>
              <p className="mt-1 text-[11px] font-semibold tracking-[0.14em] text-neutral-400 uppercase">
                {label}
              </p>
            </div>
          ))}
        </div>

        {course.outline.length > 0 ? (
          <section className="mt-10">
            <h2 className="text-[11px] font-bold tracking-[0.16em] text-neutral-400 uppercase">
              Course outline
            </h2>
            <div className="mt-4 space-y-2">
              {course.outline.map((lesson) => {
                const finished = progress.completed.includes(lesson.position);
                return (
                  <button
                    key={lesson.slug}
                    type="button"
                    onClick={enroll}
                    className="flex w-full items-center gap-4 rounded-2xl bg-[#f7f7f7] px-4 py-4 text-left"
                  >
                    <span className="w-10 shrink-0 text-2xl font-bold text-neutral-300">
                      {lesson.position}.
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold">{lesson.title}</h3>
                      <p className="mt-0.5 text-[13px] text-neutral-400">
                        {lesson.durationLabel || "Self-paced"}
                        {isDptc && lesson.position === 1 ? " · quiz after this module" : ""}
                      </p>
                    </div>
                    <div className="hidden w-36 shrink-0 sm:block">
                      <p className="mb-1 text-right text-[11px] text-neutral-400">
                        {finished ? "Completed" : enrolled ? "In progress" : "Not started"}
                      </p>
                      <ProgressTrack value={finished ? 100 : 0} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <p className="mt-10 text-sm text-neutral-500">
            Lessons will appear here once staff publish them.
          </p>
        )}

        <aside className="mt-8 rounded-[24px] bg-neutral-950 p-6 text-white lg:absolute lg:top-0 lg:right-0 lg:mt-0 lg:w-[280px]">
          <dl className="space-y-4 text-sm">
            {[
              ["Price", "Free"],
              ["Level", isDptc ? dptcCourse.level : "Introductory"],
              ["Access", isDptc ? dptcCourse.access : "Self-paced"],
              ["Certificate", course.hasFinalQuiz ? "Included" : "None"],
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
            <SplitCta variant="light" className="w-full" onClick={enroll}>
              {pending
                ? "Requesting…"
                : signedIn && enrolled
                  ? "Continue this course"
                  : signedIn && waiting
                    ? dashboardCopy.requested
                    : dashboardCopy.enroll}
            </SplitCta>
            {signedIn && !enrolled ? (
              <p className="mt-3 text-center text-[12px] leading-relaxed text-white/60">
                {dashboardCopy.requestHint}
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
