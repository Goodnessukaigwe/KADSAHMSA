"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { CourseCover } from "@/components/courses/course-cover";
import { SplitCta } from "@/components/landing/split-cta";
import { OnboardingModal } from "@/components/learner/onboarding-modal";
import { useCourseSearch } from "@/components/learner/student-chrome";
import { emptyCatalogueCopy } from "@/lib/content/catalogue";
import type { CatalogueCourse } from "@/lib/courses/types";
import { dashboardCopy, returningGreeting } from "@/lib/content/dashboard";
import { requestEnrolment } from "@/lib/learning/actions";
import type { EnrolmentRecord, LearningSnapshot } from "@/lib/learning/types";
import { firstNameOf, isOnboardingDone } from "@/lib/learner-session";

export function LearnerDashboard({
  firstName,
  snapshot,
  catalogue = [],
  requestedSlugs = [],
}: {
  firstName: string;
  snapshot: LearningSnapshot;
  catalogue?: CatalogueCourse[];
  requestedSlugs?: string[];
}) {
  if (snapshot.enrolments.length > 0) {
    return (
      <EnrolledHome
        firstName={firstNameOf(firstName)}
        snapshot={snapshot}
        catalogue={catalogue}
        requestedSlugs={requestedSlugs}
      />
    );
  }

  return <NewLearnerHome catalogue={catalogue} requestedSlugs={requestedSlugs} />;
}

function NewLearnerHome({
  catalogue,
  requestedSlugs,
}: {
  catalogue: CatalogueCourse[];
  requestedSlugs: string[];
}) {
  const router = useRouter();
  const { query } = useCourseSearch();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [asked, setAsked] = useState<string[]>(requestedSlugs);

  useEffect(() => {
    setShowOnboarding(!isOnboardingDone());
  }, []);
  useEffect(() => {
    setAsked(requestedSlugs);
  }, [requestedSlugs]);

  const explore = useFilteredExplore(query, catalogue);
  const featured = !query.trim() ? catalogue[0] : null;
  const exploreList = featured
    ? explore.filter((course) => course.slug !== featured.slug)
    : explore;

  async function enroll(slug: string) {
    if (pending || asked.includes(slug)) return;
    setError(null);
    setPending(slug);
    const result = await requestEnrolment(slug);
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAsked((current) => (current.includes(slug) ? current : [...current, slug]));
    router.refresh();
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

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {featured ? (
        <article className="mt-8 grid overflow-hidden rounded-[28px] bg-neutral-950 text-white lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-[220px] lg:min-h-[280px]">
            <CourseCover
              src={featured.image}
              title={featured.title}
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
          </div>
          <div className="flex flex-col justify-center px-6 py-8 sm:px-8">
            <h2 className="text-xl font-bold sm:text-2xl">{featured.title}</h2>
            <p className="mt-2 text-sm text-white/70">Price Free</p>
            {featured.summary ? (
              <p className="mt-4 max-w-sm text-[13px] leading-relaxed text-white/75">
                {featured.summary}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <SplitCta
                variant="light"
                size="sm"
                onClick={() => enroll(featured.slug)}
              >
                {pending === featured.slug
                  ? "Requesting…"
                  : asked.includes(featured.slug)
                    ? dashboardCopy.requested
                    : dashboardCopy.enroll}
              </SplitCta>
              <Link
                href={`/courses/${featured.slug}`}
                className="text-[11px] font-bold tracking-[0.14em] text-white uppercase hover:underline"
              >
                {dashboardCopy.readMore}
              </Link>
            </div>
          </div>
        </article>
      ) : null}

      {asked.length > 0 ? (
        <p className="mt-4 text-sm text-neutral-500">{dashboardCopy.requestHint}</p>
      ) : null}

      <ExploreSection
        courses={exploreList}
        catalogueEmpty={catalogue.length === 0}
        enrolled={[]}
        requested={asked}
        pending={pending}
        onEnroll={enroll}
      />
    </div>
  );
}

function EnrolledHome({
  firstName,
  snapshot,
  catalogue,
  requestedSlugs,
}: {
  firstName: string;
  snapshot: LearningSnapshot;
  catalogue: CatalogueCourse[];
  requestedSlugs: string[];
}) {
  const router = useRouter();
  const { query } = useCourseSearch();
  const explore = useFilteredExplore(query, catalogue);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [asked, setAsked] = useState<string[]>(requestedSlugs);

  useEffect(() => {
    setAsked(requestedSlugs);
  }, [requestedSlugs]);

  const featured = snapshot.inProgress[0] ?? null;
  const started = snapshot.inProgress.filter(
    (course) => course.slug !== featured?.slug
  );

  async function enrollOrContinue(slug: string, existing?: EnrolmentRecord) {
    if (pending) return;
    if (existing) {
      router.push(existing.href);
      return;
    }
    if (asked.includes(slug)) return;
    setError(null);
    setPending(slug);
    const result = await requestEnrolment(slug);
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setAsked((current) => (current.includes(slug) ? current : [...current, slug]));
    router.refresh();
  }

  return (
    <div className="pb-10">
      <h1 className="text-3xl leading-tight font-bold tracking-tight sm:text-[2.15rem]">
        {returningGreeting(firstName)}
      </h1>
      <p className="mt-1 text-sm text-neutral-400">
        {dashboardCopy.returningEyebrow}
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {featured ? (
        <article className="mt-8 grid overflow-hidden rounded-[28px] bg-neutral-950 text-white lg:grid-cols-[1.15fr_0.85fr]">
          <div className="relative min-h-[220px] lg:min-h-[280px]">
            <CourseCover
              src={featured.image}
              title={featured.title}
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
            />
          </div>
          <div className="flex flex-col justify-center px-6 py-8 sm:px-8">
            <h2 className="text-xl font-bold sm:text-2xl">{featured.title}</h2>
            <p className="mt-2 text-sm text-white/70">{featured.moduleLabel}</p>
            <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white"
                style={{ width: `${featured.percent}%` }}
              />
            </div>
            <div className="mt-6">
              <SplitCta
                variant="light"
                onClick={() => enrollOrContinue(featured.slug, featured)}
              >
                {dashboardCopy.continueFeatured}
              </SplitCta>
            </div>
          </div>
        </article>
      ) : null}

      {started.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            {dashboardCopy.startedTitle}
          </h2>
          <div className="mt-4 flex flex-col gap-3">
            {started.map((course) => (
              <article
                key={course.slug}
                className="flex flex-col gap-4 rounded-2xl bg-white p-3 sm:flex-row sm:items-center"
              >
                <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-20">
                  <CourseCover src={course.image} title={course.title} sizes="80px" />
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
                  onClick={() => enrollOrContinue(course.slug, course)}
                >
                  {dashboardCopy.continueShort}
                </SplitCta>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <ExploreSection
        courses={explore}
        catalogueEmpty={catalogue.length === 0}
        enrolled={snapshot.enrolledSlugs}
        requested={asked}
        pending={pending}
        onEnroll={(slug) =>
          enrollOrContinue(
            slug,
            snapshot.enrolments.find((course) => course.slug === slug)
          )
        }
      />
    </div>
  );
}

function useFilteredExplore(query: string, catalogue: CatalogueCourse[]) {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalogue;
    return catalogue.filter((course) => course.title.toLowerCase().includes(q));
  }, [query, catalogue]);
}

function ExploreSection({
  courses,
  catalogueEmpty,
  enrolled,
  requested,
  pending,
  onEnroll,
}: {
  courses: CatalogueCourse[];
  catalogueEmpty: boolean;
  enrolled: string[];
  requested: string[];
  pending: string | null;
  onEnroll: (slug: string) => void;
}) {
  return (
    <section id="explore" className="mt-12 scroll-mt-24">
      <h2 className="text-2xl font-bold tracking-tight">
        {dashboardCopy.exploreTitle}
      </h2>
      {courses.length === 0 ? (
        <p className="mt-8 text-sm text-neutral-500">
          {catalogueEmpty ? emptyCatalogueCopy : "No courses match your search."}
        </p>
      ) : (
        <div className="mt-6 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <article key={course.slug} className="flex flex-col">
              <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                <CourseCover
                  src={course.image}
                  title={course.title}
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
                  {pending === course.slug
                    ? enrolled.includes(course.slug)
                      ? "Opening…"
                      : "Requesting…"
                    : enrolled.includes(course.slug)
                      ? dashboardCopy.continue
                      : requested.includes(course.slug)
                        ? dashboardCopy.requested
                        : dashboardCopy.enroll}
                </SplitCta>
                <Link
                  href={
                    enrolled.includes(course.slug)
                      ? `/learn/${course.slug}`
                      : `/courses/${course.slug}`
                  }
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
