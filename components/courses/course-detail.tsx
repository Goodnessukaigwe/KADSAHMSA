"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SplitCta } from "@/components/landing/split-cta";
import { ProgressTrack } from "@/components/learner/simulated-video";
import { getCatalogueCourse } from "@/lib/content/catalogue";
import { dptcCourse, dptcModules } from "@/lib/content/dptc";
import { enrolInCourse } from "@/lib/learning/actions";
import { continueHref, emptyProgress, type CourseProgress } from "@/lib/learning/progress";

export function CourseDetail({
  slug,
  signedIn,
  enrolled,
  progress,
}: {
  slug: string;
  signedIn: boolean;
  enrolled: boolean;
  progress: CourseProgress;
}) {
  const router = useRouter();
  const course = getCatalogueCourse(slug)!;
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isDptc = course.slug === dptcCourse.slug;
  const continueTo = continueHref(course.slug, enrolled ? progress : emptyProgress());

  async function enroll() {
    if (!signedIn) {
      router.push("/register");
      return;
    }
    if (pending) return;
    if (enrolled) {
      router.push(continueTo);
      return;
    }
    setError(null);
    setPending(true);
    const result = await enrolInCourse(course.slug);
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.push(continueHref(course.slug, emptyProgress()));
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
            {course.priceType === "free" ? "Free" : "Paid"}
          </span>
        </div>

        <div className="relative mt-4 aspect-[16/9] overflow-hidden rounded-2xl">
          <Image
            src={isDptc ? dptcCourse.hero : course.image}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 800px"
          />
        </div>

        <h1 className="mt-6 max-w-3xl text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          {isDptc ? dptcCourse.title : course.title}
        </h1>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-neutral-500">
          {isDptc
            ? dptcCourse.description
            : `${course.title} sits in the KADSAMHSA catalogue alongside the UNODC/EU DPTC curriculum. Start with DPTC — the launch course — then return here for this pathway.`}
        </p>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(isDptc
            ? [
                [String(dptcModules.length), "Modules"],
                [dptcCourse.durationHours, "Duration"],
                [`${dptcCourse.passMark}%`, "Pass mark"],
                [dptcCourse.enrolledCount, "Enrolled"],
              ]
            : [
                [String(course.lessons), "Lessons"],
                ["Self-paced", "Duration"],
                [`${dptcCourse.passMark}%`, "Pass mark"],
                [course.priceType === "free" ? "Free" : "Paid", "Access"],
              ]
          ).map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-[#f7f7f7] px-5 py-4">
              <p className="text-2xl font-bold">{value}</p>
              <p className="mt-1 text-[11px] font-semibold tracking-[0.14em] text-neutral-400 uppercase">
                {label}
              </p>
            </div>
          ))}
        </div>

        {isDptc ? (
          <section className="mt-10">
            <h2 className="text-[11px] font-bold tracking-[0.16em] text-neutral-400 uppercase">
              Course outline
            </h2>
            <div className="mt-4 space-y-2">
              {dptcModules.map((module) => (
                <button
                  key={module.slug}
                  type="button"
                  onClick={enroll}
                  className="flex w-full items-center gap-4 rounded-2xl bg-[#f7f7f7] px-4 py-4 text-left"
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
                      Completed: 0/{module.slides}
                    </p>
                    <ProgressTrack value={0} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <p className="mt-10 text-sm text-neutral-500">
            Looking for the live curriculum?{" "}
            <Link href="/courses/dptc" className="font-semibold text-neutral-950 underline">
              Open the DPTC course
            </Link>
            .
          </p>
        )}

        <aside className="mt-8 rounded-[24px] bg-neutral-950 p-6 text-white lg:absolute lg:top-0 lg:right-0 lg:mt-0 lg:w-[280px]">
          <dl className="space-y-4 text-sm">
            {[
              ["Price", course.priceType === "free" ? "Free" : "Paid"],
              ["Level", isDptc ? dptcCourse.level : "Introductory"],
              ["Access", isDptc ? dptcCourse.access : "Self-paced"],
              ["Certificate", isDptc ? dptcCourse.certificate : "On completion"],
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
                ? "Enrolling…"
                : signedIn && enrolled
                  ? "Continue this course"
                  : "Enroll for this course"}
            </SplitCta>
          </div>
        </aside>
      </div>
    </div>
  );
}
