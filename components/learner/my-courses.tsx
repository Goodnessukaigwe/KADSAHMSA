"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ListFilter } from "lucide-react";

import { SplitCta } from "@/components/landing/split-cta";
import { useCourseSearch } from "@/components/learner/student-chrome";
import { ProgressTrack } from "@/components/learner/simulated-video";
import { catalogueCourses, type CatalogueCourse } from "@/lib/content/catalogue";
import { enrolInCourse } from "@/lib/learning/actions";
import { continueHref, emptyProgress } from "@/lib/learning/progress";
import type { EnrolmentRecord, LearningSnapshot } from "@/lib/learning/types";
import { getCertificates } from "@/lib/learner-session";
import { cn } from "@/lib/utils";

type Tab = "all" | "progress" | "completed" | "not-started";

export function MyCourses({ snapshot }: { snapshot: LearningSnapshot }) {
  const router = useRouter();
  const { query } = useCourseSearch();
  const [tab, setTab] = useState<Tab>("all");
  const [certs, setCerts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    setCerts(getCertificates().length);
  }, []);

  const free = catalogueCourses.filter((course) => course.priceType === "free");
  const inProgress = snapshot.inProgress;
  const completed = snapshot.completed;
  const enrolledSlugs = new Set(snapshot.enrolledSlugs);
  const notStartedList = free.filter((course) => !enrolledSlugs.has(course.slug));

  const visibleNotStarted = useMemo(() => {
    const q = query.trim().toLowerCase();
    return notStartedList.filter((course) => {
      if (q && !course.title.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, notStartedList]);

  const visibleProgress = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inProgress.filter((course) =>
      q ? course.title.toLowerCase().includes(q) : true
    );
  }, [query, inProgress]);

  const inProgressCount = inProgress.length;
  const completedCount = completed.length;
  const notStartedCount = notStartedList.length;
  const dptc = snapshot.enrolments.find((course) => course.slug === "dptc");
  const dptcPercent = dptc?.percent ?? 0;

  async function enroll(slug: string) {
    if (pending) return;
    setError(null);
    setPending(slug);
    const existing = snapshot.enrolments.find((course) => course.slug === slug);
    if (existing) {
      router.push(existing.href);
      return;
    }
    const result = await enrolInCourse(slug);
    if (!result.ok) {
      setError(result.error);
      setPending(null);
      return;
    }
    router.push(continueHref(slug, emptyProgress()));
    router.refresh();
  }

  function resume(course: EnrolmentRecord) {
    router.push(course.href);
  }

  return (
    <div className="pb-12">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My courses</h1>
      <p className="mt-2 text-sm text-neutral-400">
        Everything you’ve enrolled in, and everything you haven’t started yet.
      </p>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard value={String(inProgressCount)} label="In progress" href="/my/courses" />
        <StatCard value={String(certs)} label="Certificates" href="/certificates" />
        <StatCard
          value={`${dptcPercent}%`}
          label="DPTC progress"
          href="/learn/dptc"
          bar={dptcPercent}
        />
        <StatCard value="0" label="Time learning" href="/my/courses" />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-5" role="tablist">
          {(
            [
              ["all", "All"],
              ["progress", `In progress (${inProgressCount})`],
              ["completed", `Completed (${completedCount})`],
              ["not-started", `Not started (${notStartedCount})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "border-b-2 pb-1.5 text-[11px] font-bold tracking-[0.14em] uppercase",
                tab === id
                  ? "border-neutral-950 text-neutral-950"
                  : "border-transparent text-neutral-400"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-neutral-500 uppercase"
        >
          <ListFilter className="size-3.5" />
          Filter
        </button>
      </div>

      {tab === "all" || tab === "progress" ? (
        <section className="mt-8">
          {tab === "all" ? (
            <h2 className="text-[11px] font-bold tracking-[0.16em] uppercase">
              Continue learning
            </h2>
          ) : null}
          {visibleProgress.length === 0 ? (
            <p className="mt-8 text-sm text-neutral-500">No courses in this view.</p>
          ) : (
            <div className={cn("flex flex-col gap-3", tab === "all" && "mt-4")}>
              {visibleProgress.map((course) => (
                <ProgressRow
                  key={course.slug}
                  course={course}
                  onContinue={() => resume(course)}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}

      {tab === "all" || tab === "not-started" ? (
        <section className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-bold tracking-[0.16em] uppercase">
              {tab === "not-started" ? "Not started" : "Not started yet"}
            </h2>
            <Link
              href="/courses"
              className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-950"
            >
              View full catalogue →
            </Link>
          </div>
          {visibleNotStarted.length === 0 ? (
            <p className="mt-8 text-sm text-neutral-500">No courses in this view.</p>
          ) : (
            <CatalogueGrid
              courses={
                tab === "all" ? visibleNotStarted.slice(0, 3) : visibleNotStarted
              }
              pending={pending}
              onEnroll={enroll}
            />
          )}
        </section>
      ) : null}

      {tab === "all" && completed.length > 0 ? (
        <CompletedSection courses={completed} />
      ) : null}

      {tab === "completed" ? (
        completed.length === 0 ? (
          <p className="mt-8 text-sm text-neutral-500">No courses in this view.</p>
        ) : (
          <section className="mt-8">
            <div className="flex flex-col gap-3">
              {completed.map((course) => (
                <CompletedRow key={course.slug} course={course} />
              ))}
            </div>
          </section>
        )
      ) : null}

      {tab === "not-started" && completed.length > 0 ? (
        <section className="mt-12">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-bold tracking-[0.16em] uppercase">
              Courses you’ve completed
            </h2>
            <button
              type="button"
              onClick={() => setTab("completed")}
              className="text-[12px] font-semibold text-neutral-500 hover:text-neutral-950"
            >
              View all →
            </button>
          </div>
          <div className="mt-4">
            <CompletedRow course={completed[0]} />
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatCard({
  value,
  label,
  href,
  bar,
}: {
  value: string;
  label: string;
  href: string;
  bar?: number;
}) {
  return (
    <Link href={href} className="rounded-2xl bg-white px-5 py-4">
      <p className="text-2xl font-bold">
        {value}{" "}
        <span className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          {label}
        </span>
      </p>
      {bar != null ? (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-neutral-950"
            style={{ width: `${bar}%` }}
          />
        </div>
      ) : null}
    </Link>
  );
}

function ProgressRow({
  course,
  onContinue,
}: {
  course: EnrolmentRecord;
  onContinue: () => void;
}) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-white p-3 sm:flex-row sm:items-center">
      <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-xl sm:h-[72px] sm:w-[88px]">
        <Image src={course.image} alt="" fill className="object-cover" sizes="88px" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold">{course.title}</h3>
        <p className="mt-0.5 text-[13px] text-neutral-500">{course.moduleLabel}</p>
        <div className="mt-2 max-w-md">
          <ProgressTrack value={course.percent} />
        </div>
      </div>
      <RowAction label="Continue" onClick={onContinue} />
    </article>
  );
}

function CompletedRow({
  course,
}: {
  course: { slug: string; title: string; moduleLabel: string; image: string };
}) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl bg-white p-3 sm:flex-row sm:items-center">
      <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-xl sm:h-[72px] sm:w-[88px]">
        <Image src={course.image} alt="" fill className="object-cover" sizes="88px" />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold">{course.title}</h3>
        <p className="mt-0.5 text-[13px] text-neutral-500">{course.moduleLabel}</p>
        <div className="mt-2 max-w-md">
          <ProgressTrack value={100} tone="complete" />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-emerald-700 uppercase">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Completed
        </span>
        <RowAction label="View certificate" href="/certificates" />
      </div>
    </article>
  );
}

function CompletedSection({
  courses,
}: {
  courses: Array<{ slug: string; title: string; moduleLabel: string; image: string }>;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-[11px] font-bold tracking-[0.16em] uppercase">Completed</h2>
      <div className="mt-4 flex flex-col gap-3">
        {courses.map((course) => (
          <CompletedRow key={course.slug} course={course} />
        ))}
      </div>
    </section>
  );
}

function CatalogueGrid({
  courses,
  pending,
  onEnroll,
}: {
  courses: CatalogueCourse[];
  pending: string | null;
  onEnroll: (slug: string) => void;
}) {
  return (
    <div className="mt-5 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((course) => (
        <article key={course.slug} className="flex flex-col">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
            <Image
              src={course.image}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
            <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-[10px] font-bold tracking-[0.16em] uppercase backdrop-blur-sm">
              Free
            </span>
          </div>
          <h3 className="mt-4 min-h-[3.25rem] text-[17px] leading-snug font-bold">
            {course.title}
          </h3>
          <p className="mt-1 text-sm text-neutral-400">{course.lessons} lessons</p>
          <div className="mt-4 flex items-center gap-2">
            <SplitCta
              size="sm"
              className="min-w-0 flex-1"
              onClick={() => onEnroll(course.slug)}
            >
              {pending === course.slug ? "Enrolling…" : "Enroll for this course"}
            </SplitCta>
            <Link
              href={`/learn/${course.slug}`}
              className="inline-flex h-9 shrink-0 items-center rounded-full bg-white px-4 text-[11px] font-bold tracking-[0.12em] uppercase"
            >
              Read more
            </Link>
          </div>
        </article>
      ))}
    </div>
  );
}

function RowAction({
  label,
  onClick,
  href,
}: {
  label: string;
  onClick?: () => void;
  href?: string;
}) {
  const className = "group inline-flex shrink-0 items-stretch gap-1";
  const inner = (
    <>
      <span className="inline-flex h-10 items-center rounded-full bg-neutral-200 px-5 text-[11px] font-bold tracking-[0.12em] text-neutral-800 uppercase">
        {label}
      </span>
      <span className="flex size-10 items-center justify-center rounded-full bg-neutral-950 text-white transition-transform group-hover:translate-x-0.5">
        <ArrowRight className="size-4" strokeWidth={2.25} />
      </span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}
