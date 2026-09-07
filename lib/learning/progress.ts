import { catalogueCourses } from "@/lib/content/catalogue";
import { dptcModules, moduleHref } from "@/lib/content/dptc";

export type CourseProgress = {
  currentModule: number;
  completed: number[];
  playerSeconds: number;
};

export function emptyProgress(): CourseProgress {
  return { currentModule: 1, completed: [], playerSeconds: 0 };
}

export function moduleCountFor(slug: string) {
  if (slug === "dptc") return dptcModules.length;
  return catalogueCourses.find((course) => course.slug === slug)?.lessons ?? 1;
}

export function progressPercent(progress: CourseProgress, totalModules: number) {
  if (totalModules <= 0) return 0;
  const done = progress.completed.length;
  const partial = progress.currentModule > done ? 0.35 : 0;
  return Math.min(100, Math.round(((done + partial) / totalModules) * 100));
}

export function isCourseComplete(slug: string, progress: CourseProgress) {
  return progress.completed.length >= moduleCountFor(slug);
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

export function moduleLabelFor(slug: string, progress: CourseProgress) {
  const total = moduleCountFor(slug);
  if (slug === "dptc") {
    const mod =
      dptcModules.find((item) => item.index === progress.currentModule) ??
      dptcModules[0];
    return `Module ${mod.index} of ${total}: ${mod.title}`;
  }
  return `Module ${Math.min(progress.currentModule, total)} of ${total}`;
}

export function thumbnailFor(slug: string) {
  return (
    catalogueCourses.find((course) => course.slug === slug)?.image ??
    "/landing/hero-phoenix.webp"
  );
}
