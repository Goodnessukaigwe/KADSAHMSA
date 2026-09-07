"use client";

import { useEffect } from "react";
import { Download } from "lucide-react";

import { PlayerRail } from "@/components/learner/player-rail";
import {
  adjacentHrefs,
  dptcCourse,
  getDptcModule,
  getLesson,
} from "@/lib/content/dptc";
import { markModuleComplete } from "@/lib/learning/actions";

export function LessonReader({
  courseSlug,
  lessonSlug,
}: {
  courseSlug: string;
  lessonSlug: string;
}) {
  const lesson = getLesson(lessonSlug);
  const lessonModule = getDptcModule(lesson.slug);
  const nav = adjacentHrefs(courseSlug, lesson.slug);

  useEffect(() => {
    void markModuleComplete(dptcCourse.slug, lessonModule.index);
  }, [lessonModule.index]);

  return (
    <div className="grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_280px]">
      <article>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-neutral-950 px-5 py-3 text-white">
          <p className="text-[11px] font-bold tracking-[0.14em] uppercase">
            {lesson.kicker}
          </p>
          <div className="flex items-center gap-4">
            <p className="text-[11px] tracking-[0.12em] uppercase text-white/70">
              {lesson.readTime}
            </p>
            <a
              href={dptcCourse.hero}
              download
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase"
            >
              <Download className="size-3.5" />
              Download as PDF
            </a>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">
          {lesson.title}
        </h1>

        <div className="mt-8 max-w-3xl space-y-8 text-[15px] leading-relaxed text-neutral-700">
          <section id={lesson.sections[0].id}>
            <p>{lesson.sections[0].body}</p>
          </section>

          <aside className="rounded-2xl bg-neutral-100 px-5 py-4 text-sm text-neutral-700">
            <p className="font-semibold">{lesson.keyTerm.title}</p>
            <p className="mt-1">{lesson.keyTerm.body}</p>
          </aside>

          {lesson.sections.slice(1).map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="text-lg font-bold text-neutral-950">
                {section.title}
              </h2>
              <p className="mt-2">{section.body}</p>
            </section>
          ))}
        </div>
      </article>

      <PlayerRail
        toc={{
          title: "In this lesson",
          items: lesson.sections.map((section) => ({
            id: section.id,
            label: section.title,
          })),
        }}
        quizHref={`/learn/${courseSlug}/quiz`}
        previousHref={nav.previousHref}
        previousLabel={nav.previousLabel}
        nextHref={nav.nextHref}
        nextLabel={nav.nextLabel}
        nextPrimary
      />
    </div>
  );
}
