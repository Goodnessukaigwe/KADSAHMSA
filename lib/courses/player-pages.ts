import { isPlayIntroLesson, lessonPageHref } from "@/lib/courses/paths";
import {
  leftoverNonImageAssets,
  orderedSectionMedia,
  unsectionedLessonImages,
  type LessonAsset,
  type LessonAssetSection,
} from "@/lib/courses/types";

export type LessonPageSource = {
  slug: string;
  title: string;
  position: number;
  durationLabel: string;
  introduction: string;
  main: string;
  notes: string;
  assets: LessonAsset[];
};

export type CoursePage = {
  page: number;
  lessonSlug: string;
  lessonTitle: string;
  moduleIndex: number;
  section: LessonAssetSection;
  href: string;
  isFirstPageOfModule: boolean;
  isLastPageOfModule: boolean;
};

const SECTION_ORDER: LessonAssetSection[] = ["introduction", "main", "notes"];

export function lessonHasText(value: string) {
  return (
    value
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim().length > 0
  );
}

export function parsePageParam(value?: string | string[]) {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return null;
  const page = Number.parseInt(raw, 10);
  if (!Number.isFinite(page) || page < 1) return null;
  return page;
}

export function parsePartParam(value?: string | string[]): LessonAssetSection | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "introduction" || raw === "main" || raw === "notes" ? raw : null;
}

function sectionText(lesson: LessonPageSource, section: LessonAssetSection) {
  if (section === "introduction") return lesson.introduction;
  if (section === "main") return lesson.main;
  return lesson.notes;
}

function sectionsForLesson(lesson: LessonPageSource): LessonAssetSection[] {
  const sections = SECTION_ORDER.filter(
    (section) =>
      lessonHasText(sectionText(lesson, section)) ||
      orderedSectionMedia(lesson.assets, section).length > 0
  );
  if (
    sections.length ||
    (!unsectionedLessonImages(lesson.assets).length &&
      !leftoverNonImageAssets(lesson.assets).length)
  ) {
    return sections;
  }
  return ["introduction"];
}

export function buildCoursePages(
  courseSlug: string,
  lessons: LessonPageSource[]
): CoursePage[] {
  const pages: CoursePage[] = [];
  for (const lesson of lessons) {
    if (isPlayIntroLesson(courseSlug, lesson.slug)) continue;
    const sections = sectionsForLesson(lesson);
    sections.forEach((section, index) => {
      const page = pages.length + 1;
      pages.push({
        page,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        moduleIndex: lesson.position,
        section,
        href: lessonPageHref(courseSlug, lesson.slug, page),
        isFirstPageOfModule: index === 0,
        isLastPageOfModule: index === sections.length - 1,
      });
    });
  }
  return pages;
}

export function resolveCoursePage(
  pages: CoursePage[],
  lessonSlug: string,
  requestedPage: number | null,
  requestedPart: LessonAssetSection | null
) {
  if (!pages.length) return null;
  if (requestedPage) {
    return (
      pages.find((item) => item.page === requestedPage) ??
      pages.find((item) => item.lessonSlug === lessonSlug) ??
      pages[0]
    );
  }
  const inLesson = pages.filter((item) => item.lessonSlug === lessonSlug);
  if (!inLesson.length) return null;
  if (requestedPart) {
    return inLesson.find((item) => item.section === requestedPart) ?? inLesson[0];
  }
  return inLesson[0];
}
