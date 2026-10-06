"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  LessonAssetLink,
  LessonMedia,
  LessonSectionMedia,
} from "@/components/learner/lesson-media";
import { CourseCover } from "@/components/courses/course-cover";
import { InlineCheck } from "@/components/learner/lesson-check";
import { PlainBody } from "@/components/learner/lesson-prose";
import { PlayerRail } from "@/components/learner/player-rail";
import { hasLessonMarkup, sanitizeLessonHtml } from "@/lib/courses/rich-text";
import { courseTheme, pageEyebrow } from "@/lib/courses/theme";
import {
  leftoverNonImageAssets,
  orderedSectionMedia,
  unsectionedLessonImages,
  type LessonAssetSection,
  type PlayerPageView,
} from "@/lib/courses/types";
import { completeLesson, markModuleComplete } from "@/lib/learning/actions";
import { cn } from "@/lib/utils";

const SECTION_LABEL: Record<LessonAssetSection, string> = {
  introduction: "Introduction",
  main: "Main content",
  notes: "Additional notes",
};

export function LessonReader({
  courseSlug,
  courseTitle = "",
  lesson,
  progressPercent = 0,
  gated = false,
  completed = false,
  hasChecks = false,
  hasVideo = false,
}: {
  courseSlug: string;
  courseTitle?: string;
  lesson: PlayerPageView;
  progressPercent?: number;
  /** Learners (not staff) must finish each page before the next one opens. */
  gated?: boolean;
  /** This page is already complete. */
  completed?: boolean;
  /** The page holds questions: answering them completes it. */
  hasChecks?: boolean;
  /** The page holds a video: it completes when opened, with no tick. */
  hasVideo?: boolean;
}) {
  const router = useRouter();
  const [navPending, setNavPending] = useState(false);
  const [picked, setPicked] = useState<Record<number, number>>({});
  const [done, setDone] = useState(completed);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const requireChecks = gated && !completed;
  const needsTick = gated && !hasChecks && !hasVideo;

  const checks = useMemo(
    () =>
      lesson.mainBlocks.flatMap((block, index) => (block.check ? [{ index, check: block.check }] : [])),
    [lesson.mainBlocks]
  );
  const unanswered = checks.filter((item) => picked[item.index] === undefined).length;
  const nextLocked =
    requireChecks && unanswered > 0
      ? `Answer the ${unanswered === 1 ? "question" : `${unanswered} questions`} on this page to continue.`
      : gated && needsTick && !done
        ? "Press “Mark as complete” to continue."
        : gated && (hasChecks || hasVideo) && !done
          ? "Finishing this page…"
          : undefined;
  const scored = checks.filter((item) => item.check.answer !== null);
  const correct = scored.filter((item) => picked[item.index] === item.check.answer).length;
  const showSummary = checks.length >= 2 && unanswered === 0 && scored.length === checks.length;

  async function finishPage() {
    if (done || saving) return;
    setSaving(true);
    const result = await completeLesson(courseSlug, lesson.slug, lesson.moduleIndex);
    setSaving(false);
    if (result.ok) {
      setSaveError(null);
      setDone(true);
      router.refresh();
    } else {
      setSaveError(result.error);
    }
  }

  // Video pages complete when opened; question pages complete when every question is answered.
  const answeredAll = checks.length > 0 && unanswered === 0;
  useEffect(() => {
    if (gated && !completed && hasVideo && !hasChecks) void finishPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (gated && !completed && answeredAll) void finishPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answeredAll]);


  function goNext() {
    if (navPending) return;
    setNavPending(true);
    if (lesson.completeOnNext) {
      void markModuleComplete(courseSlug, lesson.moduleIndex);
    }
    if (lesson.nextHref) {
      router.push(lesson.nextHref);
      return;
    }
    setNavPending(false);
  }

  const isPreTest = /pre-test/i.test(lesson.title);

  function renderBlocks() {
    let number = 0;
    return (
      <>
        {lesson.mainBlocks.map((block, index) => {
          if (block.check) {
            number += 1;
            const check = (
              <InlineCheck
                check={block.check}
                number={checks.length > 1 ? number : undefined}
                selected={picked[index] ?? null}
                large={!isPreTest}
                onSelect={(choice) => setPicked((current) => ({ ...current, [index]: choice }))}
              />
            );
            if (isPreTest) return <section key={`check-${index}`}>{check}</section>;
            return (
              <section key={`check-${index}`} className="rounded-3xl bg-[var(--cream)] p-5 sm:p-7">
                <p className="mb-3 text-[11px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase">
                  {block.heading || "Knowledge check"}
                </p>
                {check}
              </section>
            );
          }
          const key = /key points/i.test(block.heading ?? "");
          if (key) {
            return (
              <section key={`key-${index}`} className="rounded-3xl bg-[var(--deep)] p-6 text-white sm:p-8">
                <p className="text-[11px] font-bold tracking-[0.2em] text-[#f2c14e] uppercase">Key points</p>
                <h2 className="mt-1 mb-4 text-2xl font-bold tracking-tight">{block.heading}</h2>
                <PlainBody value={block.body} variant="key" className="!bg-transparent !p-0" />
              </section>
            );
          }
          return (
            <section key={`${block.heading ?? "block"}-${index}`}>
              {block.heading ? (
                <h2 className="mb-3 text-xl font-bold tracking-tight text-[var(--deep)] sm:text-2xl">
                  {block.heading}
                </h2>
              ) : null}
              <LessonRichText value={block.body} />
            </section>
          );
        })}
        {showSummary ? (
          <p className="rounded-2xl bg-[var(--deep)] px-5 py-4 text-sm text-white">
            You answered <strong>{correct} of {scored.length}</strong> correctly. This is only your
            starting point: it is not graded.
          </p>
        ) : null}
      </>
    );
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
  // When slides are already rendered inline as images, leftover original PDFs
  // become a small secondary download link. Legacy PPTX files download instead.
  const hasInlineImages = wideImages.length > 0;
  const originalDeckFiles = hasInlineImages
    ? leftoverMedia.filter((asset) => asset.kind === "pdf")
    : [];
  const bottomMedia = hasInlineImages
    ? leftoverMedia.filter((asset) => asset.kind !== "pdf")
    : leftoverMedia;

  const theme = courseTheme(courseSlug);
  const themeVars = {
    "--deep": theme.deep,
    "--accent": theme.accent,
    "--soft": theme.soft,
    "--cream": theme.cream,
  } as React.CSSProperties;
  const moduleTitle = lesson.toc.find((group) => group.current)?.title ?? "";
  const eyebrow = pageEyebrow(lesson.title, moduleTitle);
  const special = eyebrow !== moduleTitle;
  const tinted = eyebrow === "Case study";
  const footerTag = special ? eyebrow : `Page ${lesson.page} of ${lesson.pageCount}`;
  const percentOfCourse = lesson.pageCount ? Math.round((lesson.page / lesson.pageCount) * 100) : 0;

  return (
    <div className="grid min-w-0 gap-8 overflow-x-clip pb-16 lg:grid-cols-[minmax(0,1fr)_280px]" style={themeVars}>
      <article className="min-w-0 overflow-hidden rounded-[28px] bg-white shadow-sm ring-1 ring-black/5">
        <div className="h-1 bg-neutral-100" role="presentation">
          <div className="h-full bg-[var(--accent)]" style={{ width: `${percentOfCourse}%` }} />
        </div>

        {lesson.isFirstPageOfModule && moduleTitle ? (
          <header className="relative isolate overflow-hidden bg-[var(--deep)] px-6 py-10 text-white sm:px-10 sm:py-14">
            <CourseCover slug={courseSlug} title={moduleTitle} className="-z-10 bg-transparent opacity-20 mix-blend-luminosity" />
            <span aria-hidden="true" className="absolute -top-24 -right-20 -z-10 size-72 rounded-full bg-white/[0.06]" />
            <span aria-hidden="true" className="absolute -bottom-32 left-1/3 -z-10 size-72 rounded-full bg-white/[0.04]" />
            <p className="text-[11px] font-bold tracking-[0.22em] text-[#f2c14e] uppercase">
              KADSAMHSA Learning Management System
            </p>
            <p className="mt-8 text-sm font-bold tracking-[0.2em] text-[#f2c14e] uppercase">
              Module {lesson.moduleIndex}
            </p>
            <h2 className="mt-2 max-w-2xl text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
              {moduleTitle}
            </h2>
            <p className="mt-4 text-sm text-white/70">
              {courseTitle ? `${courseTitle} · ` : ""}pre-test, lessons, knowledge checks and a graded quiz
            </p>
          </header>
        ) : null}

        <div className={cn("px-6 py-8 sm:px-10 sm:py-10", tinted && "bg-[var(--soft)]")}>
          <p className="text-[11px] font-bold tracking-[0.2em] text-[var(--accent)] uppercase">
            {eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl leading-[1.12] font-bold tracking-tight text-[var(--deep)] sm:text-[2.5rem]">
            {lesson.title}
          </h1>
          <p className="mt-3 text-xs font-semibold tracking-[0.1em] text-neutral-400 uppercase">
            {lesson.readTime}
            {lesson.isSingleLessonPage ? "" : ` · ${SECTION_LABEL[lesson.section]}`}
          </p>

          {wideImages.length ? (
            <div className="mt-8">
              <LessonSectionMedia assets={wideImages} layout="wide" />
            </div>
          ) : null}

          <div className="mt-8 max-w-3xl space-y-10 text-[16px] leading-relaxed text-neutral-700">
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
                {renderBlocks()}
                <LessonRichText value={lesson.notes} />
              </>
            ) : (
              <>
                {otherPageMedia.length ? <LessonSectionMedia assets={otherPageMedia} /> : null}
                {lesson.section === "introduction" ? (
                  <LessonRichText value={lesson.introduction} />
                ) : null}
                {lesson.section === "main" ? renderBlocks() : null}
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
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-neutral-100 bg-white px-6 py-3.5 text-[11px] text-neutral-400 sm:px-10">
          <span className="min-w-0 truncate">
            KADSAMHSA Learning Management System{courseTitle ? ` · ${courseTitle}` : ""} · Module {lesson.moduleIndex}
          </span>
          <span className="shrink-0 font-bold tracking-[0.16em] text-[var(--accent)] uppercase">{footerTag}</span>
        </footer>
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
        navPending={navPending}
        onNext={lesson.completeOnNext ? goNext : undefined}
        nextLocked={nextLocked}
        complete={
          needsTick ? { done, saving, error: saveError, onClick: () => void finishPage() } : undefined
        }
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
    return <PlainBody value={value} className={className} />;
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
