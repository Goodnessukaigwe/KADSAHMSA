import { dptcModules, moduleHref } from "@/lib/content/dptc";
import { coverForSlug } from "@/lib/courses/media";

export type CourseProgress = {
  currentModule: number;
  completed: number[];
  playerSeconds: number;
};

export function emptyProgress(): CourseProgress {
  return { currentModule: 1, completed: [], playerSeconds: 0 };
}

export function moduleCountFor(slug: string, liveCount?: number) {
  if (liveCount != null && liveCount > 0) return liveCount;
  if (slug === "dptc") return dptcModules.length;
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
  progress: CourseProgress = emptyProgress()
) {
  if (slug === "dptc") {
    const current =
      dptcModules.find((item) => item.index === progress.currentModule) ??
      (progress.currentModule > dptcModules.length
        ? dptcModules[dptcModules.length - 1]
        : dptcModules[0]);
    return moduleHref("dptc", current.slug);
  }
  return `/learn/${slug}`;
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
  return coverForSlug(slug, coverPath);
}
