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

export type LessonAsset = {
  id: string;
  lessonId: string;
  position: number;
  kind: LessonAssetKind;
  title: string;
  storagePath: string | null;
  externalUrl: string | null;
  section: LessonAssetSection | null;
};

export function parseLessonAssetSection(value: unknown): LessonAssetSection | null {
  return value === "introduction" || value === "main" || value === "notes" ? value : null;
}

export function sectionedLessonImage(assets: LessonAsset[], section: LessonAssetSection) {
  return assets.find((asset) => asset.kind === "image" && asset.section === section);
}

export function leftoverLessonAssets(assets: LessonAsset[]) {
  return assets.filter((asset) => !(asset.kind === "image" && asset.section));
}

export function unsectionedLessonImages(assets: LessonAsset[]) {
  return assets.filter((asset) => asset.kind === "image" && !asset.section);
}

export function leftoverNonImageAssets(assets: LessonAsset[]) {
  return assets.filter((asset) => asset.kind !== "image");
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
  lessons: BuilderLesson[];
  finalQuestions: BuilderQuizQuestion[];
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
};

export type PlayerPageView = PlayerLesson & {
  page: number;
  pageCount: number;
  section: LessonAssetSection;
  isFirstPageOfModule: boolean;
  isLastPageOfModule: boolean;
  pages: { page: number; href: string }[];
};

export type PublishedLessonOutline = {
  slug: string;
  title: string;
  position: number;
  durationLabel: string;
};

export type PublishedCourse = CatalogueCourse & {
  outline: PublishedLessonOutline[];
  hasFinalQuiz: boolean;
};
