"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  LessonAssetLink,
  LessonMedia,
  LessonSectionMedia,
} from "@/components/learner/lesson-media";
import { InlineCheck } from "@/components/learner/lesson-check";
import { PlayerRail } from "@/components/learner/player-rail";
import { hasLessonMarkup, sanitizeLessonHtml } from "@/lib/courses/rich-text";
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
  lesson,
  progressPercent = 0,
  gated = false,
  completed = false,
  hasChecks = false,
  hasVideo = false,
}: {
  courseSlug: string;
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

  function renderBlocks() {
    let number = 0;
    return (
      <>
        {lesson.mainBlocks.map((block, index) => {
          if (block.check) {
            number += 1;
            return (
              <section key={`check-${index}`}>
                {block.heading ? (
                  <h2 className="mb-2 text-lg font-bold text-neutral-950">{block.heading}</h2>
                ) : null}
                <InlineCheck
                  check={block.check}
                  number={checks.length > 1 ? number : undefined}
                  selected={picked[index] ?? null}
                  onSelect={(choice) => setPicked((current) => ({ ...current, [index]: choice }))}
                />
              </section>
            );
          }
          return (
            <section key={`${block.heading ?? "block"}-${index}`}>
              {block.heading ? (
                <h2 className="text-lg font-bold text-neutral-950">{block.heading}</h2>
              ) : null}
              <LessonRichText className={block.heading ? "mt-2" : undefined} value={block.body} />
            </section>
          );
        })}
        {showSummary ? (
          <p className="rounded-2xl bg-neutral-950 px-5 py-4 text-sm text-white">
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
        {needsTick ? (
          <button
            type="button"
            onClick={() => void finishPage()}
            disabled={done || saving}
            className={cn(
              "mt-10 flex h-12 items-center gap-2 rounded-full px-6 text-[11px] font-bold tracking-[0.14em] uppercase",
              done
                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600"
                : "bg-neutral-950 text-white disabled:opacity-60"
            )}
          >
            {done ? <Check className="size-4" /> : null}
            {done ? "Completed" : saving ? "Saving…" : "Mark as complete"}
          </button>
        ) : null}
        {saveError ? <p className="mt-3 text-sm text-red-600">{saveError}</p> : null}
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
      />
    </div>
  );
}

const URL_PATTERN = /(https?:\/\/[^\s<>"')]+[^\s<>"').,;:!?])/g;

function Linked({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-neutral-950 underline underline-offset-2 hover:text-neutral-600"
          >
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  );
}

/** Plain lesson text: keeps line breaks, links every web address, and lays resource lists out as links. */
function PlainText({ value, className }: { value: string; className?: string }) {
  const lines = value.split("\n").map((line) => line.trim());
  const isUrl = (line: string) => /^https?:\/\/\S+$/.test(line);

  // "Title — what it is" followed by a web address on the next line is a resource.
  const resources: { title: string; note: string; url: string }[] = [];
  const rest: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const next = lines[i + 1];
    if (lines[i] && !isUrl(lines[i]) && next && isUrl(next)) {
      const raw = value.split("\n")[i] ?? lines[i];
      const wide = raw.split(/\s{2,}[—–]\s{2,}/);
      const [title, ...note] = wide.length > 1 ? wide : lines[i].split(/\s+[—–]\s+/);
      resources.push({ title: title.trim(), note: note.join(" — ").trim(), url: next });
      i += 1;
    } else if (lines[i] || rest.length) {
      rest.push(lines[i]);
    }
  }

  if (resources.length >= 1) {
    return (
      <div className={className}>
        {rest.some(Boolean) ? (
          <p className="whitespace-pre-line">
            <Linked text={rest.join("\n").trim()} />
          </p>
        ) : null}
        <ul className="mt-3 space-y-3">
          {resources.map((item) => (
            <li key={item.url} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-neutral-950 underline underline-offset-2 hover:text-neutral-600"
              >
                {item.title}
                <span aria-hidden="true"> ↗</span>
              </a>
              {item.note ? <p className="mt-1 text-sm text-neutral-500">{item.note}</p> : null}
              <p className="mt-1 text-xs break-all text-neutral-400">{item.url}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <p className={cn("whitespace-pre-line", className)}>
      <Linked text={value} />
    </p>
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
    return <PlainText value={value} className={className} />;
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
