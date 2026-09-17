"use client";

import { useEffect } from "react";

import { LessonMedia, LessonSectionImage } from "@/components/learner/lesson-media";
import { PlayerRail } from "@/components/learner/player-rail";
import { hasLessonMarkup, sanitizeLessonHtml } from "@/lib/courses/rich-text";
import {
  leftoverNonImageAssets,
  sectionedLessonImage,
  unsectionedLessonImages,
  type LessonAssetSection,
  type PlayerPageView,
} from "@/lib/courses/types";
import { markModuleComplete } from "@/lib/learning/actions";
import { cn } from "@/lib/utils";

const SECTION_LABEL: Record<LessonAssetSection, string> = {
  introduction: "Introduction",
  main: "Main content",
  notes: "Additional notes",
};

export function LessonReader({
  courseSlug,
  lesson,
}: {
  courseSlug: string;
  lesson: PlayerPageView;
}) {
  useEffect(() => {
    if (!lesson.isLastPageOfModule) return;
    void markModuleComplete(courseSlug, lesson.moduleIndex);
  }, [courseSlug, lesson.isLastPageOfModule, lesson.moduleIndex]);

  const assets = lesson.assets ?? [];
  const pageImage = sectionedLessonImage(assets, lesson.section);
  const leftoverImages = lesson.isFirstPageOfModule ? unsectionedLessonImages(assets) : [];
  const leftoverMedia = lesson.isLastPageOfModule ? leftoverNonImageAssets(assets) : [];

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
        <p className="mt-2 text-sm font-semibold tracking-[0.08em] text-neutral-400 uppercase">
          {SECTION_LABEL[lesson.section]}
        </p>

        <div className="mt-8 max-w-3xl space-y-8 text-[15px] leading-relaxed text-neutral-700">
          {leftoverImages.map((asset) => (
            <LessonSectionImage key={asset.id} asset={asset} />
          ))}
          <LessonSectionImage asset={pageImage} />
          {lesson.section === "introduction" ? (
            <LessonRichText value={lesson.introduction} />
          ) : null}
          {lesson.section === "main"
            ? lesson.mainBlocks.map((block, index) => (
                <section key={`${block.heading ?? "block"}-${index}`}>
                  {block.heading ? (
                    <h2 className="text-lg font-bold text-neutral-950">{block.heading}</h2>
                  ) : null}
                  <LessonRichText className={block.heading ? "mt-2" : undefined} value={block.body} />
                </section>
              ))
            : null}
          {lesson.section === "notes" ? <LessonRichText value={lesson.notes} /> : null}
        </div>

        <LessonMedia assets={leftoverMedia} />
      </article>

      <PlayerRail
        toc={{
          title: "Pages",
          items: lesson.pages.map((item) => ({
            id: `page-${item.page}`,
            label: `Page ${item.page}`,
            href: item.href,
            current: item.page === lesson.page,
          })),
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

function LessonRichText({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  if (!value) return null;
  if (!hasLessonMarkup(value)) {
    return <p className={className}>{value}</p>;
  }
  const html = sanitizeLessonHtml(value);
  if (!html) return null;
  const inlineOnly = !/<(?:p|ul|ol|li|br)\b/i.test(html);
  const markupClassName = cn(
    "[&_a]:underline [&_em]:italic [&_strong]:font-semibold",
    "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5",
    "[&_p+p]:mt-3",
    className
  );
  if (inlineOnly) {
    return <p className={markupClassName} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <div className={markupClassName} dangerouslySetInnerHTML={{ __html: html }} />;
}
