import "server-only";

import { lessonPlayerHref, moduleQuizHref } from "@/lib/courses/paths";
import { dptcModules, getLesson } from "@/lib/content/dptc";
import {
  buildCoursePages,
  parsePageParam,
  parsePartParam,
  playerTocFromPages,
  resolveCoursePage,
  type CoursePage,
  type LessonPageSource,
} from "@/lib/courses/player-pages";
import { resolveWorkingCoverUrl } from "@/lib/courses/cover";
import {
  COURSE_MEDIA_BUCKET,
  coverForSlug,
  isMissingAssetsRelation,
  isMissingSectionColumn,
  isPublicCoverPath,
  isStockLandingCover,
  LESSON_ASSET_COLUMNS,
  LESSON_ASSET_COLUMNS_LEGACY,
  MISSING_PLAYER_SQL,
} from "@/lib/courses/media";
import { hasLessonMarkup } from "@/lib/courses/rich-text";
import {
  ADMIN_COURSE_COLUMN_IDS,
  type AdminCourseColumnId,
  type AdminCourseDetail,
  type AdminCourseRow,
  type AssignableCourse,
  type BuilderLesson,
  type BuilderModule,
  type BuilderQuizQuestion,
  type CatalogueCourse,
  type CourseLearnerRow,
  type CourseNavItem,
  type DashboardStat,
  type LessonAsset,
  type PlayerLesson,
  type PlayerPageView,
  type PublishedCourse,
  type PublishedModuleOutline,
  type RecentEnrolment,
  parseLessonAssetSection,
  coverMediaAssets,
  courseCoverMedia,
  flattenBuilderLessons,
  DEFAULT_QUIZ_TIME_LIMIT_SECONDS,
  clampQuizTimeLimitSeconds,
} from "@/lib/courses/types";
import { courseHasFinalQuiz } from "@/lib/quiz/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { isStaffUser, requireStaff } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export type {
  AdminCourseColumnId,
  AdminCourseDetail,
  AdminCourseRow,
  AssignableCourse,
  BuilderLesson,
  BuilderModule,
  BuilderQuizQuestion,
  CatalogueCourse,
  CourseLearnerRow,
  CourseNavItem,
  DashboardStat,
  PlayerLesson,
  PlayerPageView,
  PublishedCourse,
  RecentEnrolment,
};

export const DEFAULT_ADMIN_COURSE_COLUMNS: AdminCourseColumnId[] = [
  "title",
  "status",
  "slug",
  "duration",
  "image00",
  "image01",
];

export async function getAdminCourseColumns(): Promise<AdminCourseColumnId[]> {
  const { user } = await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_course_preferences")
    .select("course_columns")
    .eq("user_id", user.id)
    .maybeSingle();
  const columns = data?.course_columns ?? [];
  const valid = columns.filter((column): column is AdminCourseColumnId =>
    ADMIN_COURSE_COLUMN_IDS.includes(column as AdminCourseColumnId)
  );
  return valid.length > 0 ? valid : DEFAULT_ADMIN_COURSE_COLUMNS;
}

function isMissingRelation(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("course_lessons") ||
    message.includes("summary") ||
    message.includes("duration_label") ||
    message.includes("cover_path") ||
    message.includes("quiz_questions") ||
    message.includes("lesson_assets") ||
    message.includes("course_modules") ||
    message.includes("module_id") ||
    message.includes("resume_lesson_slug") ||
    message.includes("enrolment_requests") ||
    message.includes("schema cache")
  );
}

export async function resolveCoverSrc(
  slug: string,
  coverPath?: string | null,
  courseId?: string | null
) {
  if (courseId) {
    try {
      const admin = createAdminClient();
      return (await resolveWorkingCoverUrl(admin, courseId, coverPath)) || "";
    } catch {
      return "";
    }
  }
  const trimmed = coverForSlug(slug, coverPath);
  if (!trimmed || isStockLandingCover(trimmed)) return "";
  if (isPublicCoverPath(trimmed)) return trimmed;
  try {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from(COURSE_MEDIA_BUCKET)
      .createSignedUrl(trimmed, 60 * 60);
    return data?.signedUrl ?? "";
  } catch {
    return "";
  }
}

async function courseIdsWithAssets(): Promise<Set<string>> {
  let client;
  try {
    client = createAdminClient();
  } catch {
    client = await createClient();
  }
  const { data: assets, error } = await client.from("lesson_assets").select("lesson_id");
  if (error || !assets?.length) {
    if (error && !isMissingAssetsRelation(error.message)) {
      return new Set();
    }
    return new Set();
  }
  const lessonIds = [...new Set(assets.map((row) => row.lesson_id))];
  const { data: lessons } = await client
    .from("course_lessons")
    .select("id, course_id")
    .in("id", lessonIds);
  return new Set((lessons ?? []).map((row) => row.course_id));
}

function courseHasLearnerContent(
  courseId: string,
  liveCounts: Map<string, number>,
  assetCourseIds: Set<string>
) {
  return (liveCounts.get(courseId) ?? 0) > 0 || assetCourseIds.has(courseId);
}

function toCatalogueCourse(
  row: { slug: string; title: string; summary?: string | null; duration_label?: string | null },
  lessons: number,
  image: string
): CatalogueCourse {
  return {
    slug: row.slug ?? "",
    title: row.title ?? "",
    lessons,
    priceType: "free",
    image: image ?? "",
    summary: row.summary ?? "",
    durationLabel: row.duration_label ?? "",
  };
}

function toLessonAsset(row: {
  id: string;
  lesson_id: string;
  position: number;
  kind: LessonAsset["kind"];
  title: string;
  storage_path: string | null;
  external_url: string | null;
  section?: string | null;
}): LessonAsset {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    position: row.position,
    kind: row.kind,
    title: row.title,
    storagePath: row.storage_path,
    externalUrl: row.external_url,
    section: parseLessonAssetSection(row.section ?? null),
  };
}

export async function listLessonAssets(lessonIds: string[]): Promise<Map<string, LessonAsset[]>> {
  const grouped = new Map<string, LessonAsset[]>();
  if (!lessonIds.length) return grouped;
  const supabase = await createClient();
  const primary = await supabase
    .from("lesson_assets")
    .select(LESSON_ASSET_COLUMNS)
    .in("lesson_id", lessonIds)
    .order("position", { ascending: true });
  let rows = primary.data;
  if (primary.error) {
    if (!isMissingSectionColumn(primary.error.message)) {
      return grouped;
    }
    const fallback = await supabase
      .from("lesson_assets")
      .select(LESSON_ASSET_COLUMNS_LEGACY)
      .in("lesson_id", lessonIds)
      .order("position", { ascending: true });
    if (fallback.error || !fallback.data) return grouped;
    rows = fallback.data.map((row) => ({ ...row, section: null }));
  }
  if (!rows) return grouped;
  for (const row of rows) {
    const list = grouped.get(row.lesson_id) ?? [];
    list.push(toLessonAsset(row));
    grouped.set(row.lesson_id, list);
  }
  return grouped;
}

function shortCourseName(title: string) {
  if (title.includes("DPTC") && !title.includes("Trainer")) return "DPTC Sensitization";
  if (title.includes("Community")) return "Community First Response";
  if (title.includes("Human Rights")) return "Human Rights Frameworks";
  if (title.includes("Biological")) return "Biological Drivers";
  if (title.includes("Family")) return "Family Interventions";
  return title;
}

function formatWhen(iso: string) {
  const at = new Date(iso).getTime();
  if (!Number.isFinite(at)) return "";
  const mins = Math.max(0, Math.floor((Date.now() - at) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function isMissingPlayerColumn(message: string | undefined) {
  return Boolean(
    message &&
      (message.includes("resume_lesson_slug") ||
        message.includes("module_id") ||
        message.includes("schema cache"))
  );
}

function toBuilderLesson(
  row: {
    id: string;
    title: string;
    slug: string;
    status: "draft" | "live";
    duration_label: string;
    introduction: string;
    main: string;
    notes: string;
  },
  assets: LessonAsset[] = []
): BuilderLesson {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    duration: row.duration_label,
    introduction: row.introduction,
    main: row.main,
    notes: row.notes,
    assets,
  };
}

function parseMainBlocks(main: string): { heading?: string; body: string }[] {
  const chunks = main
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  const blocks: { heading?: string; body: string }[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const current = chunks[i];
    const next = chunks[i + 1];
    if (
      next &&
      current.length <= 80 &&
      !current.includes(".") &&
      !hasLessonMarkup(current)
    ) {
      blocks.push({ heading: current, body: next });
      i += 1;
      continue;
    }
    blocks.push({ body: current });
  }
  return blocks;
}

export async function liveLessonCountByCourseId(): Promise<Map<string, number>> {
  const supabase = await createClient();
  const withModules = await supabase
    .from("course_lessons")
    .select("course_id, module_id")
    .eq("status", "live");
  if (!withModules.error && withModules.data) {
    const modules = new Map<string, Set<string>>();
    for (const row of withModules.data) {
      const set = modules.get(row.course_id) ?? new Set<string>();
      set.add(row.module_id || `lesson:${row.course_id}:${set.size}`);
      modules.set(row.course_id, set);
    }
    return new Map([...modules.entries()].map(([id, set]) => [id, set.size]));
  }
  const { data, error } = await supabase
    .from("course_lessons")
    .select("course_id")
    .eq("status", "live");
  if (error || !data) return new Map();
  const counts = new Map<string, number>();
  for (const row of data) {
    counts.set(row.course_id, (counts.get(row.course_id) ?? 0) + 1);
  }
  return counts;
}

export async function liveLessonCountForSlug(slug: string): Promise<number> {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) return 0;

  const { data, error } = await supabase
    .from("course_lessons")
    .select("id, module_id")
    .eq("course_id", course.id)
    .eq("status", "live");
  if (error || !data) return 0;
  const modules = new Set(data.map((row) => row.module_id || row.id));
  return modules.size;
}

/** Cheap published+content check for request enrolment. Avoids cover/quiz work. */
export async function isPublishedCourseAvailable(slug: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (!course) return false;
  const live = await liveLessonCountForSlug(slug);
  if (live > 0) return true;
  const assetCourseIds = await courseIdsWithAssets();
  return assetCourseIds.has(course.id);
}

export async function listPublishedCourses(): Promise<CatalogueCourse[]> {
  const supabase = await createClient();
  const full = await supabase
    .from("courses")
    .select("id, slug, title, summary, duration_label, cover_path")
    .eq("status", "published")
    .order("created_at", { ascending: true });

  const legacy =
    !full.data && isMissingRelation(full.error?.message)
      ? (
          await supabase
            .from("courses")
            .select("id, slug, title")
            .eq("status", "published")
            .eq("slug", "dptc")
            .order("created_at", { ascending: true })
        ).data?.map((row) => ({
          ...row,
          summary: "",
          duration_label: "",
          cover_path: "",
        }))
      : null;
  const rows = full.data ?? legacy;
  if (!rows) return [];

  const counts = await liveLessonCountByCourseId();
  const assetCourseIds = await courseIdsWithAssets();
  const visible = rows.filter((row) =>
    courseHasLearnerContent(row.id, counts, assetCourseIds)
  );
  return Promise.all(
    visible.map(async (row) => {
      const image = await resolveCoverSrc(row.slug, row.cover_path, row.id);
      return toCatalogueCourse(row, counts.get(row.id) ?? 0, image);
    })
  );
}

export async function getPublishedCourse(slug: string): Promise<PublishedCourse | null> {
  return getVisibleCourseInner(slug, false);
}

export async function getVisibleCourse(slug: string): Promise<PublishedCourse | null> {
  return getVisibleCourseInner(slug, await isStaffUser());
}

async function getVisibleCourseInner(
  slug: string,
  includeDrafts: boolean
): Promise<PublishedCourse | null> {
  const supabase = await createClient();
  let query = supabase
    .from("courses")
    .select("id, slug, title, summary, duration_label, cover_path, status")
    .eq("slug", slug);
  if (!includeDrafts) query = query.eq("status", "published");
  const { data: course, error } = await query.maybeSingle();

  if (error || !course) return null;
  if (!includeDrafts && course.status !== "published") return null;

  const { data: moduleRows, error: moduleError } = await supabase
    .from("course_modules")
    .select("id, slug, title, position")
    .eq("course_id", course.id)
    .order("position", { ascending: true });

  const liveLessons = await listLiveLessons(course.id);
  const quizModuleIds = await moduleIdsWithQuizzes(course.id);
  const outline: PublishedModuleOutline[] =
    course.slug === "dptc"
      ? dptcPublishedOutline()
      : !moduleError && moduleRows?.length
        ? moduleRows.flatMap((module) => {
            const children = liveLessons.filter((item) => item.module_id === module.id);
            if (!children.length) return [];
            return [
              {
                slug: module.slug,
                title: module.title,
                position: module.position,
                durationLabel: children[0].duration_label,
                hasQuiz: quizModuleIds.has(module.id),
                lessons: children.map((item) => ({
                  slug: item.slug,
                  title: item.title,
                  href: lessonPlayerHref(course.slug, item.slug),
                })),
              },
            ];
          })
        : groupLessonsAsOutline(course.slug, liveLessons, quizModuleIds);

  if (!includeDrafts && outline.length === 0) {
    const assetCourseIds = await courseIdsWithAssets();
    if (!assetCourseIds.has(course.id)) return null;
  }

  const firstLessonId = await firstLessonIdForCourse(course.id);
  const coverMedia = firstLessonId
    ? coverMediaAssets((await listLessonAssets([firstLessonId])).get(firstLessonId) ?? [])
    : [];

  return {
    slug: course.slug,
    title: course.title,
    lessons: outline.length,
    priceType: "free",
    image: await resolveCoverSrc(course.slug, course.cover_path, course.id),
    summary: course.summary,
    durationLabel: course.duration_label,
    outline,
    hasFinalQuiz: await courseHasFinalQuiz(course.id, course.slug),
    coverMedia,
  };
}

export async function listAdminCourses(): Promise<AdminCourseRow[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, slug, title, status, cover_path, duration_label")
    .order("created_at", { ascending: true });
  if (error || !data) return [];

  const { data: enrolRows } = await supabase
    .from("enrolments")
    .select("course_id")
    .eq("status", "active");
  const enrolled = new Map<string, number>();
  for (const row of enrolRows ?? []) {
    enrolled.set(row.course_id, (enrolled.get(row.course_id) ?? 0) + 1);
  }

  return Promise.all(
    data.map(async (row) => {
      const { data: lessons } = await supabase
        .from("course_lessons")
        .select("id, introduction, main, notes, module_id, position")
        .eq("course_id", row.id);
      const { data: moduleRows } = await supabase
        .from("course_modules")
        .select("id, position")
        .eq("course_id", row.id);
      const modulePos = new Map((moduleRows ?? []).map((module) => [module.id, module.position]));
      const orderedLessons = [...(lessons ?? [])].sort(
        (a, b) =>
          (modulePos.get(a.module_id) ?? a.position) - (modulePos.get(b.module_id) ?? b.position) ||
          a.position - b.position
      );
      const lessonIds = orderedLessons.map((lesson) => lesson.id);
      const { data: assets } = lessonIds.length
        ? await supabase
            .from("lesson_assets")
            .select("title, external_url, storage_path, kind")
            .in("lesson_id", lessonIds)
            .order("position", { ascending: true })
            .limit(8)
        : { data: [] as { title: string; external_url: string | null; storage_path: string | null; kind: string }[] };

      const photos = pickPhotoAssets(assets ?? []);
      const firstLesson = orderedLessons[0];

      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        image: await resolveCoverSrc(row.slug, row.cover_path, row.id),
        image01: photoLabel(photos[0]),
        image02: photoLabel(photos[1]),
        image03: photoLabel(photos[2]),
        image04: photoLabel(photos[3]),
        introduction: firstLesson?.introduction ?? "",
        main: firstLesson?.main ?? "",
        notes: firstLesson?.notes ?? "",
        status: row.status,
        enrolled: enrolled.get(row.id) ?? 0,
        duration: row.duration_label ?? "",
        lessons: lessons?.length ?? 0,
        price: "Free" as const,
      };
    })
  );
}

function photoLabel(asset?: {
  title: string;
  external_url: string | null;
  storage_path: string | null;
}) {
  if (!asset) return "";
  return asset.title || asset.external_url || asset.storage_path || "";
}

function pickPhotoAssets<
  T extends { kind: string; title: string; external_url: string | null; storage_path: string | null },
>(assets: T[]) {
  const images = assets.filter((asset) => asset.kind === "image");
  return (images.length ? images : assets).slice(0, 4);
}

export async function listCourseNav(): Promise<CourseNavItem[]> {
  const courses = await listAdminCourses();
  return courses.map((course) => ({
    slug: course.slug,
    label: shortCourseName(course.title),
  }));
}

export async function getAdminCourse(slug: string): Promise<AdminCourseDetail | null> {
  await requireStaff();
  if (slug === "new") return null;
  const supabase = await createClient();
  const { data: course, error } = await supabase
    .from("courses")
    .select("id, slug, title, status, summary, duration_label, cover_path")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !course) return null;

  const { count } = await supabase
    .from("enrolments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", course.id)
    .eq("status", "active");

  return {
    id: course.id,
    slug: course.slug,
    title: course.title,
    status: course.status,
    summary: course.summary,
    durationLabel: course.duration_label,
    coverPath: course.cover_path,
    enrolled: count ?? 0,
    modules: await listBuilderModules(course.id),
    ...(await listBuilderFinalQuestions(course.id, course.slug)),
  };
}

export async function listBuilderModules(courseId: string): Promise<BuilderModule[]> {
  const supabase = await createClient();
  const [{ data: moduleRows, error: moduleError }, lessonsResult] = await Promise.all([
    supabase
      .from("course_modules")
      .select("id, title, slug, position")
      .eq("course_id", courseId)
      .order("position", { ascending: true }),
    supabase
      .from("course_lessons")
      .select("id, title, slug, status, duration_label, introduction, main, notes, module_id, position")
      .eq("course_id", courseId)
      .order("position", { ascending: true }),
  ]);

  let lessonRows = lessonsResult.data;
  if (lessonsResult.error) {
    const legacy = await supabase
      .from("course_lessons")
      .select("id, title, slug, status, duration_label, introduction, main, notes")
      .eq("course_id", courseId)
      .order("position", { ascending: true });
    lessonRows = (legacy.data ?? []).map((row) => ({ ...row, module_id: "", position: 0 }));
  }

  const assetsByLesson = await listLessonAssets((lessonRows ?? []).map((row) => row.id));
  const quizByModule = await listModuleQuizQuestions(courseId);
  const builderLessons = (lessonRows ?? []).map((row) =>
    toBuilderLesson(row, assetsByLesson.get(row.id) ?? [])
  );
  const builderById = new Map(builderLessons.map((lesson) => [lesson.id, lesson]));

  if (moduleError || !moduleRows?.length) {
    return builderLessons.map((lesson) => ({
      id: `module-${lesson.id}`,
      title: lesson.title,
      slug: lesson.slug,
      lessons: [lesson],
      quizQuestions: [],
      quizTimeLimitSeconds: DEFAULT_QUIZ_TIME_LIMIT_SECONDS,
    }));
  }

  return moduleRows.map((module) => {
    const bank = quizByModule.get(module.id);
    return {
      id: module.id,
      title: module.title,
      slug: module.slug,
      quizQuestions: bank?.questions ?? [],
      quizTimeLimitSeconds: bank?.timeLimitSeconds ?? DEFAULT_QUIZ_TIME_LIMIT_SECONDS,
      lessons: (lessonRows ?? [])
        .filter((row) => row.module_id === module.id)
        .sort((a, b) => a.position - b.position)
        .flatMap((row) => {
          const lesson = builderById.get(row.id);
          return lesson ? [lesson] : [];
        }),
    };
  });
}

export async function listBuilderLessons(courseId: string): Promise<BuilderLesson[]> {
  return flattenBuilderLessons(await listBuilderModules(courseId));
}

async function listBuilderFinalQuestions(
  courseId: string,
  courseSlug: string
): Promise<{ finalQuestions: BuilderQuizQuestion[]; finalTimeLimitSeconds: number }> {
  const empty = {
    finalQuestions: [] as BuilderQuizQuestion[],
    finalTimeLimitSeconds: DEFAULT_QUIZ_TIME_LIMIT_SECONDS,
  };
  if (courseSlug === "dptc") return empty;
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return empty;
  }
  const { data: quiz } = await admin
    .from("quizzes")
    .select("id, time_limit_seconds")
    .eq("course_id", courseId)
    .eq("slug", "final")
    .maybeSingle();
  if (!quiz) return empty;

  const timeLimit = {
    finalTimeLimitSeconds: clampQuizTimeLimitSeconds(quiz.time_limit_seconds),
  };

  const { data, error } = await admin
    .from("quiz_questions")
    .select("id, prompt, options, correct_index")
    .eq("quiz_id", quiz.id)
    .order("position", { ascending: true });
  if (error || !data) return { finalQuestions: [], ...timeLimit };

  return {
    ...timeLimit,
    finalQuestions: data.flatMap((row) => {
      const options = padOptions(row.options);
      if (!options) return [];
      return [
        {
          id: row.id,
          prompt: row.prompt,
          options,
          correctIndex: Math.min(Math.max(row.correct_index, 0), 3),
        },
      ];
    }),
  };
}

function padOptions(options: string[] | null): [string, string, string, string] | null {
  if (!options?.length) return null;
  return [options[0] ?? "", options[1] ?? "", options[2] ?? "", options[3] ?? ""];
}

export async function listCourseLearners(slug: string): Promise<CourseLearnerRow[]> {
  await requireStaff();
  if (slug === "new") return [];
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return [];
  }

  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) return [];

  const [
    { data: profiles },
    { data: enrolRows },
    { data: progressRows },
    { data: requestRows, error: requestError },
    liveCount,
  ] = await Promise.all([
    admin.from("profiles").select("id, full_name").order("full_name", { ascending: true }),
    admin.from("enrolments").select("user_id").eq("course_id", course.id).eq("status", "active"),
    admin
      .from("course_progress")
      .select("user_id, completed_indexes")
      .eq("course_id", course.id),
    admin.from("enrolment_requests").select("user_id").eq("course_id", course.id),
    liveLessonCountForSlug(slug),
  ]);
  if (!profiles?.length) return [];

  const enrolled = new Set((enrolRows ?? []).map((row) => row.user_id));
  const requested =
    requestError && isMissingRelation(requestError.message)
      ? new Set<string>()
      : new Set((requestRows ?? []).map((row) => row.user_id));
  const completedByUser = new Map<string, number>();
  for (const row of progressRows ?? []) {
    completedByUser.set(row.user_id, new Set(row.completed_indexes ?? []).size);
  }

  const emails = new Map<string, string>();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const user of data.users) {
      emails.set(user.id, user.email ?? "");
    }
    if (data.users.length < 200) break;
  }

  return profiles
    .map((profile) => ({
      id: profile.id,
      name: profile.full_name.trim() || "Learner",
      email: emails.get(profile.id) ?? "",
      enrolled: enrolled.has(profile.id),
      requested: requested.has(profile.id) && !enrolled.has(profile.id),
      completed: completedByUser.get(profile.id) ?? 0,
      total: liveCount,
    }))
    .sort((a, b) => {
      if (a.requested !== b.requested) return a.requested ? -1 : 1;
      if (a.enrolled !== b.enrolled) return a.enrolled ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export async function listAssignableCourses(): Promise<AssignableCourse[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("slug, title, status")
    .order("title", { ascending: true });
  const rows = data ?? [];
  return [...rows].sort((a, b) => {
    if (a.status !== b.status) return a.status === "published" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

export async function getAdminDashboard(): Promise<{
  stats: DashboardStat[];
  recent: RecentEnrolment[];
}> {
  await requireStaff();
  const supabase = await createClient();

  const [
    { count: learnerCount },
    { data: published },
    { count: certCount },
    { data: enrolments },
    { data: progressRows },
    { data: recentRows },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id").eq("status", "published"),
    supabase
      .from("certificates")
      .select("id", { count: "exact", head: true })
      .eq("status", "valid"),
    supabase.from("enrolments").select("user_id, course_id").eq("status", "active"),
    supabase.from("course_progress").select("user_id, course_id, completed_indexes"),
    supabase
      .from("enrolments")
      .select("created_at, user_id, course_id")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const liveCounts = await liveLessonCountByCourseId();
  const completedByUserCourse = new Map<string, number[]>();
  for (const row of progressRows ?? []) {
    completedByUserCourse.set(
      `${row.user_id}:${row.course_id}`,
      row.completed_indexes ?? []
    );
  }

  let completedEnrolments = 0;
  for (const row of enrolments ?? []) {
    const total = liveCounts.get(row.course_id) ?? 0;
    if (!total) continue;
    const done = new Set(
      completedByUserCourse.get(`${row.user_id}:${row.course_id}`) ?? []
    ).size;
    if (done >= total) completedEnrolments += 1;
  }
  const totalEnrolments = enrolments?.length ?? 0;
  const completionRate =
    totalEnrolments > 0 ? Math.round((completedEnrolments / totalEnrolments) * 100) : 0;

  const userIds = [...new Set((recentRows ?? []).map((row) => row.user_id))];
  const courseIds = [...new Set((recentRows ?? []).map((row) => row.course_id))];
  const [{ data: profiles }, { data: courses }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
    courseIds.length
      ? supabase.from("courses").select("id, title").in("id", courseIds)
      : Promise.resolve({ data: [] }),
  ]);
  const nameById = new Map((profiles ?? []).map((row) => [row.id, row.full_name.trim() || "Learner"]));
  const titleById = new Map((courses ?? []).map((row) => [row.id, row.title]));

  return {
    stats: [
      { value: String(learnerCount ?? 0), label: "Registered learners" },
      { value: String(published?.length ?? 0), label: "Published courses" },
      { value: `${completionRate}%`, label: "Completion rate" },
      { value: String(certCount ?? 0), label: "Certificates issued" },
    ],
    recent: (recentRows ?? []).map((row) => ({
      name: nameById.get(row.user_id) ?? "Learner",
      course: titleById.get(row.course_id) ?? "Course",
      when: formatWhen(row.created_at),
    })),
  };
}

async function firstLessonIdForCourse(courseId: string) {
  const lessons = await listCourseLessonOrder(courseId);
  return lessons[0]?.id ?? null;
}

async function listCourseLessonOrder(courseId: string) {
  const supabase = await createClient();
  const [{ data: lessonRows, error: lessonError }, { data: moduleRows }] = await Promise.all([
    supabase
      .from("course_lessons")
      .select("id, slug, title, position, duration_label, introduction, main, notes, module_id, status")
      .eq("course_id", courseId),
    supabase.from("course_modules").select("id, position, title, slug").eq("course_id", courseId),
  ]);
  if (lessonError) {
    const legacy = await supabase
      .from("course_lessons")
      .select("id, slug, title, position, duration_label, introduction, main, notes, status")
      .eq("course_id", courseId)
      .order("position", { ascending: true });
    return (legacy.data ?? []).map((row) => ({
      ...row,
      module_id: "",
      modulePosition: row.position,
      moduleTitle: row.title,
      moduleSlug: row.slug,
    }));
  }
  const modules = new Map(
    (moduleRows ?? []).map((row) => [row.id, { position: row.position, title: row.title, slug: row.slug }])
  );
  return (lessonRows ?? [])
    .map((row) => {
      const parentModule = modules.get(row.module_id);
      return {
        ...row,
        modulePosition: parentModule?.position ?? row.position,
        moduleTitle: parentModule?.title ?? row.title,
        moduleSlug: parentModule?.slug ?? row.slug,
      };
    })
    .sort(
      (a, b) => a.modulePosition - b.modulePosition || a.position - b.position
    );
}

export async function listLiveLessons(courseId: string) {
  const lessons = await listCourseLessonOrder(courseId);
  return lessons.filter((row) => row.status === "live");
}

type ModuleQuizBank = {
  questions: BuilderQuizQuestion[];
  timeLimitSeconds: number;
};

async function listModuleQuizQuestions(courseId: string): Promise<Map<string, ModuleQuizBank>> {
  const grouped = new Map<string, ModuleQuizBank>();
  const supabase = await createClient();
  const { data: quizzes, error } = await supabase
    .from("quizzes")
    .select("id, module_id, time_limit_seconds")
    .eq("course_id", courseId)
    .eq("kind", "module");
  if (error || !quizzes?.length) {
    if (error && isMissingPlayerColumn(error.message)) return grouped;
    return grouped;
  }
  const withModule = quizzes.filter((row) => row.module_id);
  if (!withModule.length) return grouped;
  const { data: rows } = await supabase
    .from("quiz_questions")
    .select("id, quiz_id, prompt, options, correct_index")
    .in(
      "quiz_id",
      withModule.map((row) => row.id)
    )
    .order("position", { ascending: true });
  const byQuiz = new Map<string, BuilderQuizQuestion[]>();
  for (const row of rows ?? []) {
    const options = padOptions(row.options);
    if (!options) continue;
    const list = byQuiz.get(row.quiz_id) ?? [];
    list.push({
      id: row.id,
      prompt: row.prompt,
      options,
      correctIndex: Math.min(Math.max(row.correct_index, 0), 3),
    });
    byQuiz.set(row.quiz_id, list);
  }
  for (const quiz of withModule) {
    if (!quiz.module_id) continue;
    grouped.set(quiz.module_id, {
      questions: byQuiz.get(quiz.id) ?? [],
      timeLimitSeconds: clampQuizTimeLimitSeconds(quiz.time_limit_seconds),
    });
  }
  return grouped;
}

async function moduleIdsWithQuizzes(courseId: string): Promise<Set<string>> {
  const questions = await listModuleQuizQuestions(courseId);
  return new Set(
    [...questions.entries()].filter(([, bank]) => bank.questions.length > 0).map(([id]) => id)
  );
}

function groupLessonsAsOutline(
  courseSlug: string,
  lessons: Awaited<ReturnType<typeof listLiveLessons>>,
  quizModuleIds: Set<string>
): PublishedModuleOutline[] {
  const groups: PublishedModuleOutline[] = [];
  for (const lesson of lessons) {
    let group = groups.find(
      (item) => item.slug === (lesson.moduleSlug || lesson.slug) && item.position === lesson.modulePosition
    );
    if (!group) {
      group = {
        slug: lesson.moduleSlug || lesson.slug,
        title: lesson.moduleTitle || lesson.title,
        position: lesson.modulePosition,
        durationLabel: lesson.duration_label,
        hasQuiz: Boolean(lesson.module_id && quizModuleIds.has(lesson.module_id)),
        lessons: [],
      };
      groups.push(group);
    }
    group.lessons.push({
      slug: lesson.slug,
      title: lesson.title,
      href: lessonPlayerHref(courseSlug, lesson.slug),
    });
  }
  return groups;
}

function dptcFallbackSources(): LessonPageSource[] {
  return dptcModules.map((mod) => {
    const lesson = getLesson(mod.slug);
    const rest = lesson.sections.slice(1);
    return {
      slug: lesson.slug,
      title: lesson.title,
      position: mod.index,
      moduleSlug: mod.slug,
      moduleTitle: mod.title,
      durationLabel: lesson.readTime,
      introduction: lesson.sections[0]?.body ?? "",
      main: rest.map((section) => `${section.title}\n\n${section.body}`).join("\n\n"),
      notes: lesson.keyTerm.body,
      assets: [] as LessonAsset[],
      hasQuiz: mod.index === 1,
      introTitle: lesson.sections[0]?.title,
      mainTitle: rest.length === 1 ? rest[0].title : "Main content",
      notesTitle: lesson.keyTerm.title,
    };
  });
}

function dptcPublishedOutline(): PublishedModuleOutline[] {
  const sources = dptcFallbackSources();
  const pages = buildCoursePages("dptc", sources, { paginate: "section" });
  const groups: PublishedModuleOutline[] = [];
  for (const page of pages) {
    let group = groups.find((item) => item.position === page.moduleIndex);
    if (!group) {
      const source = sources.find((item) => item.position === page.moduleIndex);
      group = {
        slug: page.moduleSlug,
        title: page.moduleTitle,
        position: page.moduleIndex,
        durationLabel: source?.durationLabel ?? "",
        hasQuiz: Boolean(source?.hasQuiz),
        lessons: [],
      };
      groups.push(group);
    }
    group.lessons.push({
      slug: `${page.lessonSlug}-${page.section}`,
      title: page.pageTitle,
      href: page.href,
    });
  }
  return groups;
}

function toPlayerPageView(
  courseSlug: string,
  sources: LessonPageSource[],
  pages: CoursePage[],
  current: CoursePage,
  hasFinal: boolean
): PlayerPageView {
  const source = sources.find((item) => item.slug === current.lessonSlug) ?? {
    slug: current.lessonSlug,
    title: current.lessonTitle,
    position: current.moduleIndex,
    moduleSlug: current.moduleSlug,
    moduleTitle: current.moduleTitle,
    durationLabel: "",
    introduction: "",
    main: "",
    notes: "",
    assets: [] as LessonAsset[],
    hasQuiz: false,
  };
  const index = pages.findIndex((item) => item.page === current.page);
  const previous = index > 0 ? pages[index - 1] : null;
  const next = index >= 0 && index < pages.length - 1 ? pages[index + 1] : null;
  const lastHref = hasFinal ? `/learn/${courseSlug}/final` : `/learn/${courseSlug}`;
  const quizHref = source.hasQuiz ? moduleQuizHref(courseSlug, source.moduleSlug) : undefined;
  const atModuleEnd = current.isLastPageOfModule;
  let nextHref = next?.href ?? lastHref;
  let nextLabel = next ? "Next" : hasFinal ? "Final assessment" : "Back to course";
  if (atModuleEnd && quizHref) {
    nextHref = quizHref;
    nextLabel = "Next";
  }
  return {
    slug: source.slug,
    title: source.title,
    kicker: `Page ${current.page} of ${pages.length}`,
    readTime: source.durationLabel || "Read",
    introduction: source.introduction,
    mainBlocks: parseMainBlocks(source.main),
    notes: source.notes,
    moduleIndex: source.position,
    previousHref: previous?.href,
    previousLabel: "Previous",
    nextHref,
    nextLabel,
    quizHref: atModuleEnd ? quizHref ?? (!next && hasFinal ? lastHref : undefined) : undefined,
    completeOnNext: atModuleEnd && !source.hasQuiz,
    assets: source.assets,
    page: current.page,
    pageCount: pages.length,
    section: current.section,
    isFirstPageOfModule: current.isFirstPageOfModule,
    isLastPageOfModule: current.isLastPageOfModule,
    isFirstPageOfCourse: current.page === 1,
    isSingleLessonPage: current.isSingleLessonPage,
    coverAssets: courseCoverMedia(sources),
    toc: playerTocFromPages(pages, current.page),
  };
}

export async function getPlayerLesson(
  courseSlug: string,
  lessonSlug: string
): Promise<PlayerLesson | null> {
  const result = await getPlayerPage(courseSlug, lessonSlug);
  return result?.lesson ?? null;
}

export async function getPlayerPage(
  courseSlug: string,
  lessonSlug: string,
  pageParam?: string,
  partParam?: string
): Promise<{ lesson: PlayerPageView; canonicalHref: string } | null> {
  const requestedPage = parsePageParam(pageParam);
  const requestedPart = parsePartParam(partParam);

  if (courseSlug === "dptc") {
    const sources = dptcFallbackSources();
    const pages = buildCoursePages(courseSlug, sources, { paginate: "section" });
    const current = resolveCoursePage(pages, lessonSlug, requestedPage, requestedPart);
    if (!current) return null;
    return {
      lesson: toPlayerPageView(courseSlug, sources, pages, current, true),
      canonicalHref: current.href,
    };
  }

  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug, status")
    .eq("slug", courseSlug)
    .maybeSingle();

  if (!course) return null;

  const lessons = await listLiveLessons(course.id);
  const [assetsByLesson, quizModuleIds] = await Promise.all([
    listLessonAssets(lessons.map((item) => item.id)),
    moduleIdsWithQuizzes(course.id),
  ]);
  const sources: LessonPageSource[] = lessons.map((item) => ({
    slug: item.slug,
    title: item.title,
    position: item.modulePosition,
    moduleSlug: item.moduleSlug,
    moduleTitle: item.moduleTitle,
    durationLabel: item.duration_label,
    introduction: item.introduction,
    main: item.main,
    notes: item.notes,
    assets: assetsByLesson.get(item.id) ?? [],
    hasQuiz: Boolean(item.module_id && quizModuleIds.has(item.module_id)),
  }));
  const pages = buildCoursePages(courseSlug, sources);
  const current = resolveCoursePage(pages, lessonSlug, requestedPage, requestedPart);
  if (!current) return null;
  const hasFinal = await courseHasFinalQuiz(course.id, courseSlug);
  return {
    lesson: toPlayerPageView(courseSlug, sources, pages, current, hasFinal),
    canonicalHref: current.href,
  };
}

export { lessonPlayerHref, MISSING_PLAYER_SQL };

export async function continuePathFor(
  slug: string,
  currentModule: number,
  resumeLessonSlug?: string | null
): Promise<string> {
  if (resumeLessonSlug) {
    if (slug === "dptc" && dptcModules.some((item) => item.slug === resumeLessonSlug)) {
      return lessonPlayerHref(slug, resumeLessonSlug);
    }
    const supabase = await createClient();
    const { data: course } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
    if (course) {
      const lessons = await listLiveLessons(course.id);
      if (lessons.some((item) => item.slug === resumeLessonSlug)) {
        return lessonPlayerHref(slug, resumeLessonSlug);
      }
    }
  }
  const supabase = await createClient();
  const { data: course } = await supabase.from("courses").select("id").eq("slug", slug).maybeSingle();
  if (course && slug !== "dptc") {
    const lessons = await listLiveLessons(course.id);
    if (lessons.length) {
      const inModule = lessons.filter((item) => item.modulePosition === currentModule);
      const current =
        inModule[0] ??
        (currentModule > lessons[lessons.length - 1].modulePosition
          ? lessons[lessons.length - 1]
          : lessons[0]);
      return lessonPlayerHref(slug, current.slug);
    }
  }
  if (slug === "dptc") {
    const current =
      dptcModules.find((item) => item.index === currentModule) ?? dptcModules[0];
    return lessonPlayerHref(slug, current.slug);
  }
  return `/learn/${slug}`;
}

