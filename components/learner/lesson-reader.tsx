"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import {
  LessonAssetLink,
  LessonMedia,
  LessonSectionMedia,
} from "@/components/learner/lesson-media";
import { PlayerRail } from "@/components/learner/player-rail";
import { hasLessonMarkup, sanitizeLessonHtml } from "@/lib/courses/rich-text";
import {
  leftoverNonImageAssets,
  orderedSectionMedia,
  unsectionedLessonImages,
  type LessonAssetSection,
  type PlayerPageView,
} from "@/lib/courses/types";
import { markModuleComplete, saveResumeLesson } from "@/lib/learning/actions";
import { cn } from "@/lib/utils";

const SECTION_LABEL: Record<LessonAssetSection, string> = {
  introduction: "Introduction",
  main: "Main content",
  notes: "Additional notes",
};

export function LessonReader({
  courseSlug,
  lesson,
  progressPercent = 0,
}: {
  courseSlug: string;
  lesson: PlayerPageView;
  progressPercent?: number;
}) {
  const router = useRouter();

  useEffect(() => {
    void saveResumeLesson(courseSlug, lesson.slug, lesson.moduleIndex);
  }, [courseSlug, lesson.slug, lesson.moduleIndex]);

  async function goNext() {
    if (lesson.completeOnNext) {
      await markModuleComplete(courseSlug, lesson.moduleIndex);
    }
    if (lesson.nextHref) router.push(lesson.nextHref);
  }

  const assets = lesson.assets ?? [];
  const pageMedia = orderedSectionMedia(assets, lesson.section);
  const leftoverImages =
    lesson.isSingleLessonPage || lesson.isFirstPageOfModule
      ? unsectionedLessonImages(assets)
      : [];
  const leftoverMedia =
    lesson.isSingleLessonPage || lesson.isLastPageOfModule
      ? leftoverNonImageAssets(assets)
      : [];
  const coverMedia = lesson.isFirstPageOfCourse ? lesson.coverAssets : [];
  const wideImages = [
    ...leftoverImages,
    ...(lesson.isSingleLessonPage
      ? (["introduction", "main", "notes"] as const).flatMap((section) =>
          orderedSectionMedia(assets, section).filter((asset) => asset.kind === "image")
        )
      : pageMedia.filter((asset) => asset.kind === "image")),
  ];
  const otherCover = coverMedia.filter((asset) => asset.kind !== "image");
  const otherPageMedia = pageMedia.filter((asset) => asset.kind !== "image");
  // When the slides are already rendered inline as images (PowerPoint import),
  // the leftover original deck becomes a small secondary download link instead
  // of an inline render or a "download to view" card.
  const hasInlineImages = wideImages.length > 0;
  const originalDeckFiles = hasInlineImages
    ? leftoverMedia.filter((asset) => asset.kind === "pptx" || asset.kind === "pdf")
    : [];
  const bottomMedia = hasInlineImages
    ? leftoverMedia.filter((asset) => asset.kind !== "pptx" && asset.kind !== "pdf")
    : leftoverMedia;

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
        {lesson.isSingleLessonPage ? null : (
          <p className="mt-2 text-sm font-semibold tracking-[0.08em] text-neutral-400 uppercase">
            {SECTION_LABEL[lesson.section]}
          </p>
        )}

        {wideImages.length ? (
          <div className="mt-8">
            <LessonSectionMedia assets={wideImages} layout="wide" />
          </div>
        ) : null}

        <div className="mt-8 max-w-3xl space-y-8 text-[15px] leading-relaxed text-neutral-700">
          {otherCover.length ? <LessonSectionMedia assets={otherCover} /> : null}
          {lesson.isSingleLessonPage ? (
            <>
              {(["introduction", "main", "notes"] as const).map((section) => {
                const media = orderedSectionMedia(assets, section).filter(
                  (asset) => asset.kind !== "image"
                );
                return media.length ? <LessonSectionMedia key={section} assets={media} /> : null;
              })}
              <LessonRichText value={lesson.introduction} />
              {lesson.mainBlocks.map((block, index) => (
                <section key={`${block.heading ?? "block"}-${index}`}>
                  {block.heading ? (
                    <h2 className="text-lg font-bold text-neutral-950">{block.heading}</h2>
                  ) : null}
                  <LessonRichText className={block.heading ? "mt-2" : undefined} value={block.body} />
                </section>
              ))}
              <LessonRichText value={lesson.notes} />
            </>
          ) : (
            <>
              {otherPageMedia.length ? <LessonSectionMedia assets={otherPageMedia} /> : null}
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
            </>
          )}
        </div>

        <LessonMedia assets={bottomMedia} />
        {originalDeckFiles.length ? (
          <div className="mt-6 max-w-3xl space-y-2">
            {originalDeckFiles.map((asset) => (
              <LessonAssetLink key={asset.id} asset={asset} />
            ))}
          </div>
        ) : null}
      </article>

      <PlayerRail
        toc={lesson.toc}
        progressPercent={progressPercent}
        quizHref={lesson.quizHref}
        previousHref={lesson.previousHref}
        previousLabel={lesson.previousLabel}
        nextHref={lesson.nextHref}
        nextLabel={lesson.nextLabel}
        nextPrimary
        onNext={lesson.completeOnNext ? () => void goNext() : undefined}
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
    "[&_[align=left]]:text-left [&_[align=center]]:text-center [&_[align=right]]:text-right",
    "[&_[style*='text-align:left']]:text-left [&_[style*='text-align: left']]:text-left",
    "[&_[style*='text-align:center']]:text-center [&_[style*='text-align: center']]:text-center",
    "[&_[style*='text-align:right']]:text-right [&_[style*='text-align: right']]:text-right",
    className
  );
  if (inlineOnly) {
    return <p className={markupClassName} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <div className={markupClassName} dangerouslySetInnerHTML={{ __html: html }} />;
}
