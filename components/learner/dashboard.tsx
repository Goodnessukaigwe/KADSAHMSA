"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SplitCta } from "@/components/landing/split-cta";
import { OnboardingModal } from "@/components/learner/onboarding-modal";
import { useCourseSearch } from "@/components/learner/student-chrome";
import { catalogueCourses } from "@/lib/content/catalogue";
import {
  dashboardCopy,
  dashboardExploreCourses,
} from "@/lib/content/dashboard";
import {
  enrollCourse,
  getEnrolled,
  isOnboardingDone,
} from "@/lib/learner-session";

export function LearnerDashboard() {
  const router = useRouter();
  const { query } = useCourseSearch();
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setEnrolled(getEnrolled());
    setShowOnboarding(!isOnboardingDone());
  }, []);

  const explore = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = q
      ? catalogueCourses.filter((course) => course.priceType === "free")
      : dashboardExploreCourses();
    if (!q) return source;
    return source.filter((course) => course.title.toLowerCase().includes(q));
  }, [query]);

  function enroll(slug: string) {
    enrollCourse(slug);
    setEnrolled(getEnrolled());
    router.push(`/learn/${slug}`);
  }

  return (
    <div className="relative pb-10">
      {showOnboarding ? (
        <OnboardingModal onDone={() => setShowOnboarding(false)} />
      ) : null}

      <p className="text-sm text-neutral-400">{dashboardCopy.greetingEyebrow}</p>
      <h1
        className={
          showOnboarding
            ? "mt-1 max-w-xl pr-0 text-3xl leading-tight font-bold tracking-tight sm:text-[2.15rem] lg:pr-[320px]"
            : "mt-1 max-w-xl text-3xl leading-tight font-bold tracking-tight sm:text-[2.15rem]"
        }
      >
        {dashboardCopy.greeting}
      </h1>

      <article className="mt-8 grid overflow-hidden rounded-[28px] bg-neutral-950 text-white lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative min-h-[220px] lg:min-h-[280px]">
          <Image
            src={dashboardCopy.featured.image}
            alt={dashboardCopy.featured.imageAlt}
            fill
            priority
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 55vw"
          />
        </div>
        <div className="flex flex-col justify-center px-6 py-8 sm:px-8">
          <h2 className="text-xl font-bold sm:text-2xl">
            {dashboardCopy.featured.title}
          </h2>
          <p className="mt-2 text-sm text-white/70">
            Price {dashboardCopy.featured.price}
          </p>
          <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-white/75">
            {dashboardCopy.featured.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <SplitCta
              variant="light"
              size="sm"
              onClick={() => enroll(dashboardCopy.featured.slug)}
            >
              {enrolled.includes(dashboardCopy.featured.slug)
                ? dashboardCopy.continue
                : dashboardCopy.enroll}
            </SplitCta>
            <Link
              href={`/courses/${dashboardCopy.featured.slug}`}
              className="text-[11px] font-bold tracking-[0.14em] text-white uppercase hover:underline"
            >
              {dashboardCopy.readMore}
            </Link>
          </div>
        </div>
      </article>

      <section id="explore" className="mt-12 scroll-mt-24">
        <h2 className="text-2xl font-bold tracking-tight">
          {dashboardCopy.exploreTitle}
        </h2>
        {explore.length === 0 ? (
          <p className="mt-8 text-sm text-neutral-500">
            No courses match your search.
          </p>
        ) : (
          <div className="mt-6 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
            {explore.map((course) => (
              <article key={course.slug} className="flex flex-col">
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                  <Image
                    src={course.image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                  <span className="absolute top-3 right-3 rounded-full bg-white/85 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-neutral-950 uppercase backdrop-blur-sm">
                    {course.priceType === "free" ? "Free" : "Paid"}
                  </span>
                </div>
                <h3 className="mt-4 min-h-[3.25rem] text-[17px] leading-snug font-bold">
                  {course.title}
                </h3>
                <p className="mt-1 text-sm text-neutral-400">
                  {course.lessons} {course.lessons === 1 ? "lesson" : "lessons"}
                </p>
                <div className="mt-4 flex items-center gap-2">
                  <SplitCta
                    size="sm"
                    className="min-w-0 flex-1"
                    onClick={() => enroll(course.slug)}
                  >
                    {enrolled.includes(course.slug)
                      ? dashboardCopy.continue
                      : dashboardCopy.enroll}
                  </SplitCta>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="shrink-0 text-[11px] font-bold tracking-[0.12em] text-neutral-950 uppercase hover:underline"
                  >
                    {dashboardCopy.readMore}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
