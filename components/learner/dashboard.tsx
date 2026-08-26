"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SplitCta } from "@/components/landing/split-cta";
import { OnboardingModal } from "@/components/learner/onboarding-modal";
import { useCourseSearch } from "@/components/learner/student-chrome";
import { catalogueCourses, type CatalogueCourse } from "@/lib/content/catalogue";
import {
  dashboardCopy,
  dashboardExploreCourses,
  returningGreeting,
  returningStartedCourses,
} from "@/lib/content/dashboard";
import {
  enrollCourse,
  firstNameOf,
  getEnrolled,
  getLearner,
  isOnboardingDone,
  isReturningLearner,
} from "@/lib/learner-session";

export function LearnerDashboard() {
  const [returning, setReturning] = useState(false);
  const [ready, setReady] = useState(false);
  const [firstName, setFirstName] = useState("Learner");

  useEffect(() => {
    setReturning(isReturningLearner());
    setFirstName(firstNameOf(getLearner()?.name || "Learner"));
    setReady(true);
  }, []);

  if (!ready) {
    return <div className="min-h-[40vh]" />;
  }

  return returning ? (
    <ReturningHome firstName={firstName} />
  ) : (
    <NewLearnerHome />
  );
}

function NewLearnerHome() {
  const router = useRouter();
  const { query } = useCourseSearch();
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    setEnrolled(getEnrolled());
    setShowOnboarding(!isOnboardingDone());
  }, []);

  const explore = useFilteredExplore(query);

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

      <ExploreSection courses={explore} enrolled={enrolled} onEnroll={enroll} />
    </div>
  );
}

function ReturningHome({ firstName }: { firstName: string }) {
  const router = useRouter();
  const { query } = useCourseSearch();
  const explore = useFilteredExplore(query);

  function continueCourse(slug: string) {
    enrollCourse(slug);
    router.push(`/learn/${slug}`);
  }

  return (
    <div className="pb-10">
      <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-[2.15rem]">
        {returningGreeting(firstName)}
      </h1>
      <p className="mt-1 text-sm text-neutral-400">
        {dashboardCopy.returningEyebrow}
      </p>

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
            {dashboardCopy.featured.returningTitle}
          </h2>
          <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-[11px] tracking-wide text-white/45 uppercase">
                Price
              </p>
              <p className="mt-1 font-semibold">{dashboardCopy.featured.price}</p>
            </div>
            <div>
              <p className="text-[11px] tracking-wide text-white/45 uppercase">
                Module
              </p>
              <p className="mt-1 font-semibold">{dashboardCopy.featured.module}</p>
            </div>
            <div>
              <p className="text-[11px] tracking-wide text-white/45 uppercase">
                Duration
              </p>
              <p className="mt-1 font-semibold">
                {dashboardCopy.featured.duration}
              </p>
            </div>
          </div>
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white"
              style={{ width: `${dashboardCopy.featured.percent}%` }}
            />
          </div>
          <div className="mt-6">
            <SplitCta
              variant="light"
              onClick={() => continueCourse(dashboardCopy.featured.slug)}
            >
              {dashboardCopy.continueFeatured}
            </SplitCta>
          </div>
        </div>
      </article>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          {dashboardCopy.startedTitle}
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          {returningStartedCourses.map((course) => (
            <article
              key={course.slug}
              className="flex flex-col gap-4 rounded-2xl bg-white p-3 sm:flex-row sm:items-center"
            >
              <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-20">
                <Image
                  src={course.thumbnail}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">{course.title}</h3>
                <p className="mt-0.5 text-[13px] text-neutral-500">
                  {course.moduleLabel}
                </p>
                <div className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-neutral-200">
                  <div
                    className="h-full rounded-full bg-neutral-950"
                    style={{ width: `${course.percent}%` }}
                  />
                </div>
              </div>
              <SplitCta
                size="sm"
                className="shrink-0"
                onClick={() => continueCourse(course.slug)}
              >
                {dashboardCopy.continueShort}
              </SplitCta>
            </article>
          ))}
        </div>
      </section>

      <ExploreSection
        courses={explore}
        enrolled={returningStartedCourses.map((course) => course.slug)}
        onEnroll={continueCourse}
      />
    </div>
  );
}

function useFilteredExplore(query: string) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = q
      ? catalogueCourses.filter((course) => course.priceType === "free")
      : dashboardExploreCourses();
    if (!q) return source;
    return source.filter((course) => course.title.toLowerCase().includes(q));
  }, [query]);
}

function ExploreSection({
  courses,
  enrolled,
  onEnroll,
}: {
  courses: CatalogueCourse[];
  enrolled: string[];
  onEnroll: (slug: string) => void;
}) {
  return (
    <section id="explore" className="mt-12 scroll-mt-24">
      <h2 className="text-2xl font-bold tracking-tight">
        {dashboardCopy.exploreTitle}
      </h2>
      {courses.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">
          No courses match your search.
        </p>
      ) : (
        <div className="mt-6 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <article key={course.slug} className="flex flex-col">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                <Image
                  src={course.image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                />
                <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-neutral-950 uppercase backdrop-blur-sm">
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
                  onClick={() => onEnroll(course.slug)}
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
  );
}
