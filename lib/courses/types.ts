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
  slug: string;
  title: string;
  image: string;
  status: CourseStatus;
  enrolled: number;
  price: "Free";
};

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

export type LessonAsset = {
  id: string;
  lessonId: string;
  position: number;
  kind: LessonAssetKind;
  title: string;
  storagePath: string | null;
  externalUrl: string | null;
};

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
