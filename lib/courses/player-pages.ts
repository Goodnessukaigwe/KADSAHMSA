import { isPlayIntroLesson, lessonPageHref } from "@/lib/courses/paths";
import {
  leftoverNonImageAssets,
  orderedSectionMedia,
  unsectionedLessonImages,
  type LessonAsset,
  type LessonAssetSection,
  type PlayerTocGroup,
} from "@/lib/courses/types";

export type LessonPageSource = {
  slug: string;
  title: string;
  position: number;
  moduleSlug: string;
  moduleTitle: string;
  durationLabel: string;
  introduction: string;
  main: string;
  notes: string;
  assets: LessonAsset[];
  hasQuiz?: boolean;
  introTitle?: string;
  mainTitle?: string;
  notesTitle?: string;
};

export type CoursePage = {
  page: number;
  lessonSlug: string;
  lessonTitle: string;
  pageTitle: string;
  moduleIndex: number;
  moduleSlug: string;
  moduleTitle: string;
  section: LessonAssetSection;
  href: string;
  isFirstPageOfModule: boolean;
  isLastPageOfModule: boolean;
  isSingleLessonPage: boolean;
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

function sectionPageTitle(lesson: LessonPageSource, section: LessonAssetSection) {
  if (section === "introduction") return lesson.introTitle || "Introduction";
  if (section === "main") return lesson.mainTitle || "Main content";
  return lesson.notesTitle || "Additional notes";
}

function skipLesson(courseSlug: string, lesson: LessonPageSource) {
  return isPlayIntroLesson(courseSlug, lesson.slug);
}

export function buildCoursePages(
  courseSlug: string,
  lessons: LessonPageSource[],
  options?: { paginate?: "lesson" | "section" }
): CoursePage[] {
  const paginate = options?.paginate ?? "lesson";
  const included = lessons.filter((lesson) => !skipLesson(courseSlug, lesson));
  const pages: CoursePage[] = [];

  if (paginate === "lesson") {
    included.forEach((lesson, index) => {
      const previous = included[index - 1];
      const next = included[index + 1];
      const page = pages.length + 1;
      pages.push({
        page,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        pageTitle: lesson.title,
        moduleIndex: lesson.position,
        moduleSlug: lesson.moduleSlug || lesson.slug,
        moduleTitle: lesson.moduleTitle || lesson.title,
        section: "main",
        href: lessonPageHref(courseSlug, lesson.slug, page),
        isFirstPageOfModule: !previous || previous.position !== lesson.position,
        isLastPageOfModule: !next || next.position !== lesson.position,
        isSingleLessonPage: true,
      });
    });
    return pages;
  }

  for (const lesson of included) {
    const sections = sectionsForLesson(lesson);
    sections.forEach((section, index) => {
      const page = pages.length + 1;
      pages.push({
        page,
        lessonSlug: lesson.slug,
        lessonTitle: lesson.title,
        pageTitle: sectionPageTitle(lesson, section),
        moduleIndex: lesson.position,
        moduleSlug: lesson.moduleSlug || lesson.slug,
        moduleTitle: lesson.moduleTitle || lesson.title,
        section,
        href: lessonPageHref(courseSlug, lesson.slug, page),
        isFirstPageOfModule: index === 0,
        isLastPageOfModule: index === sections.length - 1,
        isSingleLessonPage: false,
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

export function playerTocFromPages(pages: CoursePage[], currentPage: number): PlayerTocGroup[] {
  const groups: PlayerTocGroup[] = [];
  for (const page of pages) {
    const id = `module-${page.moduleIndex}-${page.moduleSlug}`;
    let group = groups.find((item) => item.id === id);
    if (!group) {
      group = {
        id,
        title: page.moduleTitle || `Module ${page.moduleIndex}`,
        current: false,
        items: [],
      };
      groups.push(group);
    }
    group.items.push({
      id: `page-${page.page}`,
      label: page.pageTitle || page.lessonTitle,
      href: page.href,
      current: page.page === currentPage,
    });
    if (page.page === currentPage) group.current = true;
  }
  return groups;
}
