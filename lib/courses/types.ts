export type CourseStatus = "draft" | "published";
export type LessonStatus = "draft" | "live";

export type CatalogueCourse = {
  slug: string;
  title: string;
  lessons: number;
  priceType: "free";
  image: string;
  summary: string;
  durationLabel: string;
};

export type AdminCourseRow = {
  id: string;
  slug: string;
  title: string;
  image: string;
  image01: string;
  image02: string;
  image03: string;
  image04: string;
  introduction: string;
  main: string;
  notes: string;
  status: CourseStatus;
  enrolled: number;
  duration: string;
  lessons: number;
  price: "Free";
};

export type AdminCourseColumnId =
  | "title"
  | "status"
  | "slug"
  | "duration"
  | "image00"
  | "image01"
  | "introduction"
  | "main"
  | "notes"
  | "image02"
  | "image03"
  | "image04";

export type AdminCourseColumn = {
  id: AdminCourseColumnId;
  label: string;
};

export const ADMIN_COURSE_COLUMN_POOL: AdminCourseColumn[] = [
  { id: "title", label: "Title" },
  { id: "status", label: "Status" },
  { id: "slug", label: "Slug" },
  { id: "duration", label: "Duration" },
  { id: "image00", label: "Cover Photo" },
  { id: "image01", label: "Photo 1" },
  { id: "introduction", label: "Introduction" },
  { id: "main", label: "Main Content" },
  { id: "notes", label: "Additional Notes" },
  { id: "image02", label: "Photo 2" },
  { id: "image03", label: "Photo 3" },
  { id: "image04", label: "Photo 4" },
];

export const ADMIN_COURSE_COLUMN_IDS: AdminCourseColumnId[] = ADMIN_COURSE_COLUMN_POOL.map(
  (column) => column.id
);

export const LESSON_ASSET_KINDS = [
  "pdf",
  "pptx",
  "video",
  "youtube",
  "vimeo",
  "image",
  "audio",
] as const;

export type LessonAssetKind = (typeof LESSON_ASSET_KINDS)[number];

export const LESSON_ASSET_SECTIONS = ["introduction", "main", "notes"] as const;

export type LessonAssetSection = (typeof LESSON_ASSET_SECTIONS)[number];

export const LESSON_COVER_SECTION = "cover" as const;
export type LessonAssetStoredSection = LessonAssetSection | typeof LESSON_COVER_SECTION;

export const SECTIONED_ASSET_KINDS = ["image", "video", "pdf"] as const;
export type SectionedAssetKind = (typeof SECTIONED_ASSET_KINDS)[number];

export type LessonAsset = {
  id: string;
  lessonId: string;
  position: number;
  kind: LessonAssetKind;
  title: string;
  storagePath: string | null;
  externalUrl: string | null;
  section: LessonAssetStoredSection | null;
};

export function parseLessonAssetSection(value: unknown): LessonAssetStoredSection | null {
  return value === "cover" || value === "introduction" || value === "main" || value === "notes"
    ? value
    : null;
}

export function isSectionedAssetKind(value: unknown): value is SectionedAssetKind {
  return value === "image" || value === "video" || value === "pdf";
}

export function sectionedLessonAssets(
  assets: LessonAsset[],
  section: LessonAssetStoredSection
) {
  return assets.filter((asset) => asset.section === section);
}

export function sectionedLessonAsset(
  assets: LessonAsset[],
  section: LessonAssetStoredSection,
  kind: SectionedAssetKind
) {
  return assets.find((asset) => asset.section === section && asset.kind === kind);
}

export function sectionedLessonImage(assets: LessonAsset[], section: LessonAssetSection) {
  return sectionedLessonAsset(assets, section, "image");
}

export function orderedSectionMedia(assets: LessonAsset[], section: LessonAssetStoredSection) {
  const inSection = sectionedLessonAssets(assets, section);
  return SECTIONED_ASSET_KINDS.flatMap((kind) =>
    inSection.filter((asset) => asset.kind === kind)
  );
}

export function coverMediaAssets(assets: LessonAsset[]) {
  const inSection = sectionedLessonAssets(assets, "cover");
  return (["video", "pdf"] as const).flatMap((kind) =>
    inSection.filter((asset) => asset.kind === kind)
  );
}

export function courseCoverMedia(lessons: { assets: LessonAsset[] }[]) {
  for (const lesson of lessons) {
    const cover = coverMediaAssets(lesson.assets);
    if (cover.length) return cover;
  }
  return [];
}

export function leftoverLessonAssets(assets: LessonAsset[]) {
  return assets.filter((asset) => !asset.section);
}

export function unsectionedLessonImages(assets: LessonAsset[]) {
  return assets.filter((asset) => asset.kind === "image" && !asset.section);
}

export function leftoverNonImageAssets(assets: LessonAsset[]) {
  return assets.filter((asset) => asset.kind !== "image" && !asset.section);
}

export type BuilderLesson = {
  id: string;
  title: string;
  slug: string;
  status: LessonStatus;
  duration: string;
  introduction: string;
  main: string;
  notes: string;
  assets: LessonAsset[];
};

export const DEFAULT_QUIZ_TIME_LIMIT_SECONDS = 1800;
export const MIN_QUIZ_TIME_LIMIT_MINUTES = 1;
export const MAX_QUIZ_TIME_LIMIT_MINUTES = 1440;

export function quizTimeLimitMinutes(seconds?: number | null) {
  const minutes = Math.round((seconds ?? DEFAULT_QUIZ_TIME_LIMIT_SECONDS) / 60);
  if (!Number.isFinite(minutes) || minutes < MIN_QUIZ_TIME_LIMIT_MINUTES) {
    return Math.round(DEFAULT_QUIZ_TIME_LIMIT_SECONDS / 60);
  }
  return Math.min(MAX_QUIZ_TIME_LIMIT_MINUTES, minutes);
}

export function quizTimeLimitSeconds(minutes?: number | string | null) {
  const parsed =
    typeof minutes === "string" ? Number.parseInt(minutes, 10) : Number(minutes);
  if (!Number.isFinite(parsed) || parsed < MIN_QUIZ_TIME_LIMIT_MINUTES) {
    return DEFAULT_QUIZ_TIME_LIMIT_SECONDS;
  }
  return Math.min(MAX_QUIZ_TIME_LIMIT_MINUTES, Math.round(parsed)) * 60;
}

export function clampQuizTimeLimitSeconds(seconds?: number | null) {
  return quizTimeLimitSeconds(quizTimeLimitMinutes(seconds));
}

export type BuilderModule = {
  id: string;
  title: string;
  slug: string;
  lessons: BuilderLesson[];
  quizQuestions?: BuilderQuizQuestion[];
  quizTimeLimitSeconds?: number;
};

export function flattenBuilderLessons(modules: BuilderModule[]) {
  return modules.flatMap((module) => module.lessons);
}

export type BuilderQuizQuestion = {
  id: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
};

export type AdminCourseDetail = {
  id: string;
  slug: string;
  title: string;
  status: CourseStatus;
  summary: string;
  durationLabel: string;
  coverPath: string;
  enrolled: number;
  modules: BuilderModule[];
  finalQuestions: BuilderQuizQuestion[];
  finalTimeLimitSeconds: number;
};

export type CourseLearnerRow = {
  id: string;
  name: string;
  email: string;
  enrolled: boolean;
  requested: boolean;
  completed: number;
  total: number;
};

export type CourseNavItem = {
  slug: string;
  label: string;
};

export type DashboardStat = {
  value: string;
  label: string;
};

export type RecentEnrolment = {
  name: string;
  course: string;
  when: string;
};

export type AssignableCourse = {
  slug: string;
  title: string;
  status: CourseStatus;
};

export type PlayerLesson = {
  slug: string;
  title: string;
  kicker: string;
  readTime: string;
  introduction: string;
  mainBlocks: { heading?: string; body: string }[];
  notes: string;
  moduleIndex: number;
  previousHref?: string;
  previousLabel: string;
  nextHref?: string;
  nextLabel: string;
  quizHref?: string;
  assets: LessonAsset[];
  completeOnNext?: boolean;
};

export type PlayerTocItem = {
  id: string;
  label: string;
  href: string;
  current?: boolean;
};

export type PlayerTocGroup = {
  id: string;
  title: string;
  current?: boolean;
  items: PlayerTocItem[];
};

export type PlayerPageView = PlayerLesson & {
  page: number;
  pageCount: number;
  section: LessonAssetSection;
  isFirstPageOfModule: boolean;
  isLastPageOfModule: boolean;
  isFirstPageOfCourse: boolean;
  isSingleLessonPage: boolean;
  coverAssets: LessonAsset[];
  toc: PlayerTocGroup[];
};

export type PublishedOutlineLesson = {
  slug: string;
  title: string;
  href: string;
};

export type PublishedModuleOutline = {
  slug: string;
  title: string;
  position: number;
  durationLabel: string;
  hasQuiz: boolean;
  lessons: PublishedOutlineLesson[];
};

export type PublishedLessonOutline = PublishedModuleOutline;

export type PublishedCourse = CatalogueCourse & {
  outline: PublishedModuleOutline[];
  hasFinalQuiz: boolean;
  coverMedia: LessonAsset[];
};
