"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { CourseCover } from "@/components/courses/course-cover";
import { SplitCta } from "@/components/landing/split-cta";
import { catalogueHero, emptyCatalogueCopy } from "@/lib/content/catalogue";
import type { CatalogueCourse } from "@/lib/courses/types";
import { cn } from "@/lib/utils";

type Tab = "free" | "paid";

export function CourseCatalogue({ courses }: { courses: CatalogueCourse[] }) {
  const [tab, setTab] = useState<Tab>("free");
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;

  const visible = useMemo(() => {
    if (tab === "paid") return [];
    if (!searching) return courses;
    const q = query.trim().toLowerCase();
    return courses.filter((course) => course.title.toLowerCase().includes(q));
  }, [courses, tab, query, searching]);

  return (
    <div className="overflow-x-clip bg-white font-sans text-neutral-950">
      <section className="px-4 pt-14 pb-8 text-center sm:px-6 sm:pt-20 sm:pb-10">
        <div className="mx-auto max-w-[1120px]">
          <h1 className="mx-auto max-w-[16ch] text-[1.75rem] leading-[1.15] font-bold tracking-tight break-words sm:text-4xl lg:text-5xl">
            {catalogueHero.title}
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-neutral-500">
            {catalogueHero.subtitle}
          </p>
        </div>
      </section>

      <section className="px-4 pb-8 sm:px-6" aria-label="Course catalogue">
        <div className="mx-auto max-w-[1120px]">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-6" role="tablist" aria-label="Course type">
              {(
                [
                  ["free", "Free courses"],
                  ["paid", "Paid courses"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tab === value}
                  className={cn(
                    "border-b-2 pb-1.5 text-[11px] font-bold tracking-[0.14em] uppercase",
                    tab === value
                      ? "border-neutral-950 text-neutral-950"
                      : "border-transparent text-neutral-400 hover:text-neutral-700"
                  )}
                  onClick={() => setTab(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:max-w-[280px]">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-neutral-400" />
              <label htmlFor="courses-search" className="sr-only">
                Search courses
              </label>
              <input
                id="courses-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search courses..."
                className="h-11 w-full rounded-full border border-neutral-200 bg-[#f4f4f4] pr-4 pl-10 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 placeholder:tracking-wide focus:border-neutral-400"
              />
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-neutral-500">
              {tab === "paid"
                ? "Paid courses are not on this platform yet. Everything published here is free."
                : searching
                  ? "No published courses match your search."
                  : emptyCatalogueCopy}
            </p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((course, index) => (
                <article key={course.slug} className="flex min-w-0 flex-col">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-2xl">
                    <CourseCover
                      src={course.image}
                      title={course.title}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 360px"
                      priority={index === 0}
                    />
                    <span className="absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-[10px] font-bold tracking-[0.16em] text-neutral-950 uppercase backdrop-blur-sm">
                      Free
                    </span>
                  </div>
                  <h2 className="mt-4 min-h-[3.25rem] text-[17px] leading-snug font-bold break-words">
                    {course.title}
                  </h2>
                  <p className="mt-1 text-sm text-neutral-400">
                    {course.lessons} {course.lessons === 1 ? "lesson" : "lessons"}
                  </p>
                  <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                    <SplitCta
                      href={`/courses/${course.slug}`}
                      size="sm"
                      className="min-w-0 w-full sm:flex-1"
                    >
                      View course
                    </SplitCta>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="inline-flex h-9 shrink-0 items-center justify-center rounded-full bg-[#f4f4f4] px-4 text-[11px] font-bold tracking-[0.12em] text-neutral-950 uppercase"
                    >
                      Read more
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
