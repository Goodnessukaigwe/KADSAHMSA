import type { PublishedModuleOutline } from "@/lib/courses/types";
import type { CourseProgress } from "@/lib/learning/progress";

/**
 * Learners move through a course in order. A module opens only when the one before it is
 * complete (its quiz passed, or its last page read when it has no quiz). Inside an open module a
 * page opens only once the page before it is complete. `resumeLessonSlug` is the last page the
 * learner completed, so going back never closes anything that was already open.
 */
export type CourseAccess = {
  lessonOpen: (lessonSlug: string) => boolean;
  /** The learner has completed this page. */
  lessonDone: (lessonSlug: string) => boolean;
  moduleOpen: (position: number) => boolean;
  /** Every page of the module is complete, so its quiz may open. */
  moduleReached: (position: number) => boolean;
  /** The furthest page this learner may open now; where a locked page sends them. */
  frontierSlug: string | null;
};

export function buildAccess(
  outline: PublishedModuleOutline[],
  progress: CourseProgress,
  bypass = false
): CourseAccess {
  const completed = new Set(progress.completed);
  const open = new Set<string>();
  const finished = new Set<string>();
  const reached = new Set<number>();
  const modulesOpen = new Set<number>();
  let frontierSlug: string | null = null;

  outline.forEach((module, index) => {
    const unlocked =
      bypass || index === 0 || completed.has(outline[index - 1].position);
    if (!unlocked) return;
    modulesOpen.add(module.position);

    const slugs = module.lessons.map((lesson) => lesson.slug);
    if (!slugs.length) return;
    const done = bypass || completed.has(module.position);
    const resumeAt = progress.resumeLessonSlug
      ? slugs.indexOf(progress.resumeLessonSlug)
      : -1;
    const lastOpen = done ? slugs.length - 1 : Math.min(slugs.length - 1, resumeAt + 1);
    for (let i = 0; i <= lastOpen; i += 1) open.add(slugs[i]);
    const lastDone = done ? slugs.length - 1 : resumeAt;
    for (let i = 0; i <= lastDone; i += 1) finished.add(slugs[i]);
    if (done || resumeAt >= slugs.length - 1) reached.add(module.position);
    frontierSlug = slugs[lastOpen];
  });

  return {
    lessonOpen: (slug) => open.has(slug),
    lessonDone: (slug) => finished.has(slug),
    moduleOpen: (position) => modulesOpen.has(position),
    moduleReached: (position) => reached.has(position),
    frontierSlug,
  };
}
