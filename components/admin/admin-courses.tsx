"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { CourseCover } from "@/components/courses/course-cover";
import { SplitCta } from "@/components/landing/split-cta";
import { createDraftCourse } from "@/lib/courses/actions";
import type { AdminCourseRow } from "@/lib/courses/types";
import { cn } from "@/lib/utils";

type Tab = "all" | "published" | "drafts";

export function AdminCourses({ courses }: { courses: AdminCourseRow[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const published = useMemo(
    () => courses.filter((course) => course.status === "published"),
    [courses]
  );
  const drafts = useMemo(
    () => courses.filter((course) => course.status === "draft"),
    [courses]
  );
  const visible =
    tab === "published" ? published : tab === "drafts" ? drafts : courses;

  return (
    <div className="pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Courses
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            Publish, preview, and edit the KADSAMHSA catalogue.
          </p>
        </div>
        <form action={createDraftCourse}>
          <SplitCta icon="plus" size="sm" type="submit">
            Create new course
          </SplitCta>
        </form>
      </div>

      <div className="mt-8 flex flex-wrap gap-5" role="tablist">
        {(
          [
            ["all", `All (${courses.length})`],
            ["published", `Published (${published.length})`],
            ["drafts", `Drafts (${drafts.length})`],
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

      {visible.length === 0 ? (
        <p className="mt-10 text-sm text-neutral-400">No courses in this view.</p>
      ) : (
        <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: AdminCourseRow }) {
  const draft = course.status === "draft";
  return (
    <article className="flex flex-col">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
        <CourseCover
          src={course.image}
          title={course.title}
          sizes="(max-width: 640px) 100vw, 33vw"
        />
        <span
          className={cn(
            "absolute top-3 right-3 rounded-full px-3 py-1 text-[10px] font-bold tracking-[0.16em] uppercase backdrop-blur-sm",
            draft ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"
          )}
        >
          {draft ? "Draft" : "Published"}
        </span>
      </div>
      <h2 className="mt-4 min-h-[3.25rem] text-[17px] leading-snug font-bold">
        {course.title}
      </h2>
      <div className="mt-1 flex items-center justify-between text-sm text-neutral-400">
        <p>
          {draft
            ? "Not published"
            : `${course.enrolled.toLocaleString()} enrolled`}
        </p>
        <p>{course.price}</p>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <Link
          href={`/courses/${course.slug}`}
          className="text-[11px] font-bold tracking-[0.12em] uppercase hover:underline"
        >
          Preview
        </Link>
        <Link
          href={`/admin/courses/${course.slug}`}
          className={cn(
            "ml-auto inline-flex h-9 items-center rounded-full px-4 text-[11px] font-bold tracking-[0.12em] uppercase",
            draft ? "bg-neutral-950 text-white" : "bg-neutral-200 text-neutral-800"
          )}
        >
          {draft ? "Continue editing" : "Edit course"}
        </Link>
        <Link
          href={`/admin/courses/${course.slug}`}
          className="flex size-9 items-center justify-center rounded-full bg-neutral-950 text-white"
          aria-label={`Edit ${course.title}`}
        >
          <Pencil className="size-3.5" />
        </Link>
      </div>
    </article>
  );
}
