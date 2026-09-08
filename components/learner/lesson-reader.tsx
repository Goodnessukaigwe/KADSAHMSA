"use client";

import { useEffect } from "react";

import { LessonMedia } from "@/components/learner/lesson-media";
import { PlayerRail } from "@/components/learner/player-rail";
import type { PlayerLesson } from "@/lib/courses/types";
import { markModuleComplete } from "@/lib/learning/actions";

export function LessonReader({
  courseSlug,
  lesson,
}: {
  courseSlug: string;
  lesson: PlayerLesson;
}) {
  useEffect(() => {
    void markModuleComplete(courseSlug, lesson.moduleIndex);
  }, [courseSlug, lesson.moduleIndex]);

  return (
    <div className="grid min-w-0 gap-8 overflow-x-clip pb-16 lg:grid-cols-[minmax(0,1fr)_280px]">
      <article className="min-w-0">
        <div className="flex flex-col gap-3 rounded-2xl bg-neutral-950 px-4 py-3 text-white sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <p className="text-[11px] font-bold tracking-[0.14em] uppercase break-words">
            {lesson.kicker}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="text-[11px] tracking-[0.12em] uppercase text-white/70">
              {lesson.readTime}
            </p>
          </div>
        </div>

        <h1 className="mt-8 text-3xl font-bold tracking-tight sm:text-4xl">
          {lesson.title}
        </h1>

        <div className="mt-8 max-w-3xl space-y-8 text-[15px] leading-relaxed text-neutral-700">
          {lesson.introduction ? (
            <section id="intro">
              <p>{lesson.introduction}</p>
            </section>
          ) : null}

          {lesson.notes ? (
            <aside className="rounded-2xl bg-neutral-100 px-5 py-4 text-sm text-neutral-700">
              <p className="font-semibold">Key term</p>
              <p className="mt-1">{lesson.notes}</p>
            </aside>
          ) : null}

          {lesson.mainBlocks.map((block, index) => (
            <section key={`${block.heading ?? "block"}-${index}`} id={`block-${index}`}>
              {block.heading ? (
                <h2 className="text-lg font-bold text-neutral-950">{block.heading}</h2>
              ) : null}
              <p className={block.heading ? "mt-2" : undefined}>{block.body}</p>
            </section>
          ))}
        </div>

        <LessonMedia assets={lesson.assets ?? []} />
      </article>

      <PlayerRail
        toc={{
          title: "In this lesson",
          items: [
            ...(lesson.introduction
              ? [{ id: "intro", label: "Introduction" }]
              : []),
            ...lesson.mainBlocks.map((block, index) => ({
              id: `block-${index}`,
              label: block.heading ?? `Section ${index + 1}`,
            })),
            ...(lesson.assets?.length
              ? [{ id: "lesson-media", label: "Lesson media" }]
              : []),
          ],
        }}
        quizHref={lesson.quizHref}
        previousHref={lesson.previousHref}
        previousLabel={lesson.previousLabel}
        nextHref={lesson.nextHref}
        nextLabel={lesson.nextLabel}
        nextPrimary
      />
    </div>
  );
}
