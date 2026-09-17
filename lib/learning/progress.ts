import { dptcModules } from "@/lib/content/dptc";
import { displayCoverSrc } from "@/lib/courses/media";
import { lessonPlayerHref } from "@/lib/courses/paths";
import type { PublishedModuleOutline } from "@/lib/courses/types";

export type CourseProgress = {
  currentModule: number;
  completed: number[];
  playerSeconds: number;
  resumeLessonSlug: string | null;
};

export function emptyProgress(): CourseProgress {
  return { currentModule: 1, completed: [], playerSeconds: 0, resumeLessonSlug: null };
}

export function moduleCountFor(slug: string, liveCount?: number) {
  if (slug === "dptc") return dptcModules.length;
  if (liveCount != null && liveCount > 0) return liveCount;
  return 0;
}

export function progressPercent(progress: CourseProgress, totalModules: number) {
  if (totalModules <= 0) return 0;
  const done = progress.completed.length;
  const partial = progress.currentModule > done ? 0.35 : 0;
  return Math.min(100, Math.round(((done + partial) / totalModules) * 100));
}

export function isCourseComplete(
  slug: string,
  progress: CourseProgress,
  liveCount?: number
) {
  const total = moduleCountFor(slug, liveCount);
  if (total <= 0) return false;
  return progress.completed.length >= total;
}

export function continueHref(
  slug: string,
  progress: CourseProgress = emptyProgress(),
  fallbackHref?: string
) {
  if (progress.resumeLessonSlug) {
    return lessonPlayerHref(slug, progress.resumeLessonSlug);
  }
  if (slug === "dptc") {
    const current =
      dptcModules.find((item) => item.index === progress.currentModule) ??
      (progress.currentModule > dptcModules.length
        ? dptcModules[dptcModules.length - 1]
        : dptcModules[0]);
    return lessonPlayerHref("dptc", current.slug);
  }
  return fallbackHref ?? `/learn/${slug}`;
}

export function firstOutlineHref(
  slug: string,
  outline: PublishedModuleOutline[],
  fallback = `/learn/${slug}`
) {
  const firstLesson = outline[0]?.lessons[0];
  if (firstLesson?.href) return firstLesson.href;
  if (outline[0]?.slug) return lessonPlayerHref(slug, outline[0].slug);
  return fallback;
}

export function moduleLabelFor(
  slug: string,
  progress: CourseProgress,
  liveCount?: number
) {
  const total = moduleCountFor(slug, liveCount);
  if (slug === "dptc") {
    const mod =
      dptcModules.find((item) => item.index === progress.currentModule) ??
      dptcModules[0];
    return `Module ${mod.index} of ${total}: ${mod.title}`;
  }
  return `Module ${Math.min(progress.currentModule, total)} of ${total}`;
}

export function thumbnailFor(slug: string, coverPath?: string | null) {
  return displayCoverSrc(slug, coverPath);
}

export function resolveOutlineModule(
  outline: PublishedModuleOutline[],
  moduleParam: string | undefined,
  courseSlug: string
) {
  if (!moduleParam) {
    return courseSlug === "dptc" ? outline.find((item) => item.position === 1) ?? outline[0] : null;
  }
  return (
    outline.find((item) => item.slug === moduleParam) ??
    outline.find((item) => `module-${item.position}` === moduleParam) ??
    outline.find((item) => String(item.position) === moduleParam) ??
    null
  );
}

export function nextHrefAfterModule(
  courseSlug: string,
  outline: PublishedModuleOutline[],
  module: PublishedModuleOutline,
  hasFinal: boolean
) {
  const index = outline.findIndex((item) => item.slug === module.slug && item.position === module.position);
  const next = index >= 0 ? outline[index + 1] : null;
  if (next?.lessons[0]?.href) return next.lessons[0].href;
  if (next?.slug) return lessonPlayerHref(courseSlug, next.slug);
  return hasFinal ? `/learn/${courseSlug}/final` : `/learn/${courseSlug}`;
}
