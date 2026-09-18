"use server";

import { revalidatePath } from "next/cache";

import { findUserIdByEmail } from "@/lib/auth/admin-users";
import { removeLessonMediaObjects } from "@/lib/courses/asset-actions";
import { enrolLearnerWithAdmin, unenrolLearnerWithAdmin } from "@/lib/courses/enrol";
import { COURSE_MEDIA_BUCKET, isPublicCoverPath, isStockLandingCover, isUuid, MISSING_MODULES_SQL, MISSING_PLAYER_SQL } from "@/lib/courses/media";
import { getAdminCourse, listBuilderModules, resolveCoverSrc } from "@/lib/courses/queries";
import {
  ADMIN_COURSE_COLUMN_IDS,
  type AdminCourseColumnId,
  type AdminCourseDetail,
  type BuilderModule,
  type BuilderQuizQuestion,
  type LessonStatus,
  clampQuizTimeLimitSeconds,
} from "@/lib/courses/types";
import { requireStaff } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SlugResult =
  | { ok: true; slug: string; courseId: string; modules: BuilderModule[] }
  | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function slugFromTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function revalidateCourse(slug: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${slug}`);
  revalidatePath("/courses");
  revalidatePath(`/courses/${slug}`);
  revalidatePath(`/learn/${slug}`);
  revalidatePath(`/learn/${slug}/play`);
  revalidatePath(`/learn/${slug}/quiz`);
  revalidatePath(`/learn/${slug}/final`);
  revalidatePath("/my");
  revalidatePath("/my/courses");
}

function usableCoverPath(path?: string) {
  const trimmed = path?.trim() ?? "";
  if (!trimmed || isStockLandingCover(trimmed)) return "";
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) return "";
  return trimmed;
}

async function uniqueSlug(base: string, excludeId?: string) {
  const supabase = await createClient();
  const root = base || "untitled-course";
  for (let i = 0; i < 50; i += 1) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const query = supabase.from("courses").select("id").eq("slug", candidate);
    const { data } = await query.maybeSingle();
    if (!data || data.id === excludeId) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export type LoadCourseResult =
  | { ok: true; course: AdminCourseDetail; coverUrl: string }
  | { ok: false; error: string };

export async function loadAdminCourse(slug: string): Promise<LoadCourseResult> {
  await requireStaff();
  const trimmed = slug.trim();
  if (!trimmed || trimmed === "new") {
    return { ok: false, error: "That course was not found." };
  }
  const course = await getAdminCourse(trimmed);
  if (!course) return { ok: false, error: "That course was not found." };
  return {
    ok: true,
    course,
    coverUrl: await resolveCoverSrc(course.slug, course.coverPath, course.id),
  };
}

export async function previewCoverPath(
  path: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireStaff();
  const url = await resolveCoverSrc("", path);
  if (!url) return { ok: false, error: "Could not preview that image." };
  return { ok: true, url };
}

export type SaveCourseInput = {
  slug: string;
  title: string;
  nextSlug?: string;
  summary?: string;
  durationLabel?: string;
  coverPath?: string;
  modules: BuilderModule[];
  finalQuestions?: BuilderQuizQuestion[];
  finalTimeLimitSeconds?: number;
};

export async function saveCourse(input: SaveCourseInput): Promise<SlugResult> {
  await requireStaff();
  const title = input.title.trim() || "Untitled course";
  const supabase = await createClient();

  let courseId: string | null = null;
  let slug = input.slug;

  if (input.slug === "new") {
    slug = await uniqueSlug(slugFromTitle(input.nextSlug || title) || "untitled-course");
    const { data, error } = await supabase
      .from("courses")
      .insert({
        slug,
        title,
        status: "draft",
        summary: input.summary?.trim() ?? "",
        duration_label: input.durationLabel?.trim() ?? "",
        cover_path: usableCoverPath(input.coverPath),
      })
      .select("id")
      .single();
    if (error || !data) {
      return { ok: false, error: error?.message || "Could not create this course." };
    }
    courseId = data.id;
  } else {
    const { data: existing, error: existingError } = await supabase
      .from("courses")
      .select("id, slug")
      .eq("slug", input.slug)
      .maybeSingle();
    if (existingError || !existing) {
      return { ok: false, error: "That course was not found." };
    }
    courseId = existing.id;
    const wanted = slugFromTitle(input.nextSlug?.trim() || input.slug) || existing.slug;
    slug = wanted === existing.slug ? existing.slug : await uniqueSlug(wanted, existing.id);
    const nextCover = usableCoverPath(input.coverPath);
    const { error } = await supabase
      .from("courses")
      .update({
        title,
        slug,
        summary: input.summary?.trim() ?? "",
        duration_label: input.durationLabel?.trim() ?? "",
        ...(nextCover ? { cover_path: nextCover } : {}),
      })
      .eq("id", existing.id);
    if (error) {
      return { ok: false, error: error.message || "Could not save this course." };
    }
  }

  const moduleError = await replaceModules(courseId, input.modules);
  if (moduleError) return { ok: false, error: moduleError };

  if (slug !== "dptc") {
    const quizError = await replaceFinalQuiz(
      courseId,
      input.finalQuestions ?? [],
      input.finalTimeLimitSeconds
    );
    if (quizError) return { ok: false, error: quizError };
    const moduleQuizError = await replaceModuleQuizzes(courseId, input.modules);
    if (moduleQuizError) return { ok: false, error: moduleQuizError };
  }

  revalidateCourse(input.slug);
  revalidateCourse(slug);
  return { ok: true, slug, courseId, modules: await listBuilderModules(courseId) };
}

function uniqueEntitySlug(
  existing: string[],
  base: string,
  fallback: string
) {
  const seen = new Set(existing);
  const root = base || fallback;
  if (!seen.has(root)) return root;
  for (let i = 2; i < 80; i += 1) {
    const candidate = `${root}-${i}`;
    if (!seen.has(candidate)) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function isMissingModules(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("course_modules") ||
    message.includes("module_id") ||
    message.includes("schema cache")
  );
}

async function replaceModules(courseId: string, modules: BuilderModule[]) {
  const supabase = await createClient();
  const cleaned = modules
    .map((module) => ({
      ...module,
      lessons: module.lessons.length ? module.lessons : [],
    }))
    .filter((module) => module.lessons.length > 0);
  if (!cleaned.length) {
    return "Add a module with at least one lesson before saving.";
  }

  const { data: existingModules, error: moduleReadError } = await supabase
    .from("course_modules")
    .select("id, slug")
    .eq("course_id", courseId);
  if (moduleReadError) {
    return isMissingModules(moduleReadError.message)
      ? MISSING_MODULES_SQL
      : moduleReadError.message || "Could not load course modules.";
  }

  const { data: existingLessons, error: lessonReadError } = await supabase
    .from("course_lessons")
    .select("id, slug")
    .eq("course_id", courseId);
  if (lessonReadError) {
    return isMissingModules(lessonReadError.message)
      ? MISSING_MODULES_SQL
      : lessonReadError.message || "Could not load lessons.";
  }

  const moduleById = new Map((existingModules ?? []).map((row) => [row.id, row]));
  const usedModuleIds = new Set<string>();
  const usedModuleSlugs: string[] = [];
  const savedModuleIds: string[] = [];

  for (const [index, module] of cleaned.entries()) {
    const existingId = isUuid(module.id) && moduleById.has(module.id) ? module.id : null;
    let slug = slugFromTitle(module.slug || module.title) || `module-${index + 1}`;
    slug = uniqueEntitySlug(
      usedModuleSlugs.concat(
        (existingModules ?? [])
          .filter((row) => row.id !== existingId)
          .map((row) => row.slug)
      ),
      slug,
      `module-${index + 1}`
    );
    usedModuleSlugs.push(slug);
    const title = module.title.trim() || `Untitled module ${index + 1}`;
    const row = {
      course_id: courseId,
      position: index + 1,
      slug,
      title,
    };
    if (existingId) {
      const { error } = await supabase.from("course_modules").update(row).eq("id", existingId);
      if (error) {
        return isMissingModules(error.message)
          ? MISSING_MODULES_SQL
          : error.message || "Could not save a module.";
      }
      usedModuleIds.add(existingId);
      savedModuleIds.push(existingId);
    } else {
      const { data, error } = await supabase.from("course_modules").insert(row).select("id").single();
      if (error || !data) {
        return isMissingModules(error?.message)
          ? MISSING_MODULES_SQL
          : error?.message || "Could not save a module.";
      }
      usedModuleIds.add(data.id);
      savedModuleIds.push(data.id);
    }
  }

  const lessonById = new Map((existingLessons ?? []).map((row) => [row.id, row]));
  const usedLessonIds = new Set<string>();
  const usedLessonSlugs: string[] = [];

  for (const [moduleIndex, module] of cleaned.entries()) {
    const moduleId = savedModuleIds[moduleIndex];
    for (const [lessonIndex, lesson] of module.lessons.entries()) {
      const existingId = isUuid(lesson.id) && lessonById.has(lesson.id) ? lesson.id : null;
      let slug =
        slugFromTitle(lesson.slug || lesson.title) || `lesson-${moduleIndex + 1}-${lessonIndex + 1}`;
      slug = uniqueEntitySlug(
        usedLessonSlugs.concat(
          (existingLessons ?? [])
            .filter((row) => row.id !== existingId)
            .map((row) => row.slug)
        ),
        slug,
        `lesson-${moduleIndex + 1}-${lessonIndex + 1}`
      );
      usedLessonSlugs.push(slug);
      const status: LessonStatus = lesson.status === "live" ? "live" : "draft";
      const row = {
        course_id: courseId,
        module_id: moduleId,
        position: lessonIndex + 1,
        slug,
        title: lesson.title.trim() || `Untitled lesson ${lessonIndex + 1}`,
        status,
        duration_label: lesson.duration.trim(),
        introduction: "",
        main: lesson.main,
        notes: "",
      };
      if (existingId) {
        const { error } = await supabase.from("course_lessons").update(row).eq("id", existingId);
        if (error) {
          return isMissingModules(error.message)
            ? MISSING_MODULES_SQL
            : error.message || "Could not save a lesson.";
        }
        usedLessonIds.add(existingId);
      } else {
        const { data, error } = await supabase.from("course_lessons").insert(row).select("id").single();
        if (error || !data) {
          return isMissingModules(error?.message)
            ? MISSING_MODULES_SQL
            : error?.message || "Could not save a lesson.";
        }
        usedLessonIds.add(data.id);
      }
    }
  }

  const staleLessons = (existingLessons ?? [])
    .filter((row) => !usedLessonIds.has(row.id))
    .map((row) => row.id);
  if (staleLessons.length) {
    await removeLessonMediaObjects(staleLessons);
    const { error } = await supabase.from("course_lessons").delete().in("id", staleLessons);
    if (error) return error.message || "Could not remove a dropped lesson.";
  }

  const staleModules = (existingModules ?? [])
    .filter((row) => !usedModuleIds.has(row.id))
    .map((row) => row.id);
  if (staleModules.length) {
    const { error } = await supabase.from("course_modules").delete().in("id", staleModules);
    if (error) return error.message || "Could not remove a dropped module.";
  }
  return null;
}

async function cleanedQuizQuestions(questions: BuilderQuizQuestion[]) {
  return questions
    .map((question) => ({
      prompt: question.prompt.trim(),
      options: question.options.map((option) => option.trim()),
      correctIndex: question.correctIndex,
    }))
    .filter(
      (question) =>
        question.prompt.length > 0 &&
        question.options.length === 4 &&
        question.options.every((option) => option.length > 0)
    );
}

function isMissingModuleQuizColumn(message: string | undefined) {
  return Boolean(
    message &&
      (message.includes("module_id") || message.includes("schema cache") || message.includes("quizzes_slug_check"))
  );
}

function isSkippableSchemaError(message: string | undefined) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    lower.includes("schema cache") ||
    lower.includes("does not exist") ||
    lower.includes("could not find the table") ||
    lower.includes("could not find the")
  );
}

function deleteStepError(message: string | undefined, fallback: string): ActionResult {
  const text = (message || fallback).trim();
  if (/foreign key|violates foreign key/i.test(text)) {
    return fail(`${fallback} ${text}`);
  }
  return fail(text || fallback);
}

async function replaceFinalQuiz(
  courseId: string,
  questions: BuilderQuizQuestion[],
  timeLimitSeconds?: number | null
) {
  const admin = createAdminClient();
  const cleaned = await cleanedQuizQuestions(questions);
  const seconds = clampQuizTimeLimitSeconds(timeLimitSeconds);

  const { data: existing } = await admin
    .from("quizzes")
    .select("id")
    .eq("course_id", courseId)
    .eq("slug", "final")
    .maybeSingle();

  if (cleaned.length === 0) {
    if (existing) {
      const { error } = await admin.from("quizzes").delete().eq("id", existing.id);
      if (error) return error.message || "Could not remove the final quiz.";
    }
    return null;
  }

  for (const question of cleaned) {
    if (
      !Number.isInteger(question.correctIndex) ||
      question.correctIndex < 0 ||
      question.correctIndex > 3
    ) {
      return "Each question needs one correct option (A–D).";
    }
  }

  let quizId = existing?.id ?? null;
  if (!quizId) {
    const { data, error } = await admin
      .from("quizzes")
      .insert({
        course_id: courseId,
        slug: "final",
        kind: "final",
        pass_mark_percent: 70,
        max_attempts: 3,
        time_limit_seconds: seconds,
      })
      .select("id")
      .single();
    if (error || !data) return error?.message || "Could not save the final quiz.";
    quizId = data.id;
  } else {
    const { error } = await admin
      .from("quizzes")
      .update({ time_limit_seconds: seconds })
      .eq("id", quizId);
    if (error) return error.message || "Could not save the final quiz.";
  }

  const { error: deleteError } = await admin
    .from("quiz_questions")
    .delete()
    .eq("quiz_id", quizId);
  if (deleteError) {
    return deleteError.message?.includes("quiz_questions")
      ? "Apply supabase/apply-phase4b.sql before saving a final quiz."
      : deleteError.message || "Could not replace quiz questions.";
  }

  const { error: insertError } = await admin.from("quiz_questions").insert(
    cleaned.map((question, index) => ({
      quiz_id: quizId,
      position: index + 1,
      prompt: question.prompt,
      options: question.options,
      correct_index: question.correctIndex,
    }))
  );
  if (insertError) return insertError.message || "Could not save quiz questions.";
  return null;
}

async function replaceModuleQuizzes(courseId: string, modules: BuilderModule[]) {
  const admin = createAdminClient();
  const { data: moduleRows, error: moduleError } = await admin
    .from("course_modules")
    .select("id, position")
    .eq("course_id", courseId)
    .order("position", { ascending: true });
  if (moduleError) {
    return moduleError.message?.includes("course_modules")
      ? MISSING_MODULES_SQL
      : moduleError.message || "Could not load course modules.";
  }

  const { data: existingQuizzes, error: quizError } = await admin
    .from("quizzes")
    .select("id, module_id, slug")
    .eq("course_id", courseId)
    .eq("kind", "module");
  if (quizError) {
    return isMissingModuleQuizColumn(quizError.message)
      ? MISSING_PLAYER_SQL
      : quizError.message || "Could not load module quizzes.";
  }

  const byModuleId = new Map(
    (existingQuizzes ?? [])
      .filter((row) => row.module_id)
      .map((row) => [row.module_id as string, row])
  );

  const cleanedModules = modules.filter((module) => module.lessons.length > 0);

  for (const [index, moduleRow] of (moduleRows ?? []).entries()) {
    const cleaned = await cleanedQuizQuestions(cleanedModules[index]?.quizQuestions ?? []);
    const slug = `module-${moduleRow.position}`;
    const existing = byModuleId.get(moduleRow.id);
    if (!cleaned.length) {
      if (existing) {
        const { error } = await admin.from("quizzes").delete().eq("id", existing.id);
        if (error) return error.message || "Could not remove a module quiz.";
      }
      continue;
    }
    for (const question of cleaned) {
      if (
        !Number.isInteger(question.correctIndex) ||
        question.correctIndex < 0 ||
        question.correctIndex > 3
      ) {
        return "Each module quiz question needs one correct option (A–D).";
      }
    }
    let quizId = existing?.id ?? null;
    const seconds = clampQuizTimeLimitSeconds(cleanedModules[index]?.quizTimeLimitSeconds);
    if (!quizId) {
      const { data, error } = await admin
        .from("quizzes")
        .insert({
          course_id: courseId,
          slug,
          kind: "module",
          module_id: moduleRow.id,
          pass_mark_percent: 70,
          max_attempts: 3,
          time_limit_seconds: seconds,
        })
        .select("id")
        .single();
      if (error || !data) {
        return isMissingModuleQuizColumn(error?.message)
          ? MISSING_PLAYER_SQL
          : error?.message || "Could not save a module quiz.";
      }
      quizId = data.id;
    } else {
      const { error } = await admin
        .from("quizzes")
        .update({ slug, module_id: moduleRow.id, time_limit_seconds: seconds })
        .eq("id", quizId);
      if (error) {
        return isMissingModuleQuizColumn(error.message)
          ? MISSING_PLAYER_SQL
          : error.message || "Could not update a module quiz.";
      }
    }
    const { error: deleteError } = await admin.from("quiz_questions").delete().eq("quiz_id", quizId);
    if (deleteError) return deleteError.message || "Could not replace module quiz questions.";
    const { error: insertError } = await admin.from("quiz_questions").insert(
      cleaned.map((question, questionIndex) => ({
        quiz_id: quizId,
        position: questionIndex + 1,
        prompt: question.prompt,
        options: question.options,
        correct_index: question.correctIndex,
      }))
    );
    if (insertError) return insertError.message || "Could not save module quiz questions.";
  }
  return null;
}

export async function publishCourse(slug: string): Promise<SlugResult> {
  const saved = await saveAndPublish(slug, true);
  return saved;
}

export async function setCourseStatus(
  slug: string,
  status: "draft" | "published"
): Promise<ActionResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) return fail("That course was not found.");

  const { error } = await supabase
    .from("courses")
    .update({ status })
    .eq("id", course.id);
  if (error) return fail(error.message || "Could not update this course.");

  revalidateCourse(course.slug);
  return { ok: true };
}

export async function saveAdminCourseColumns(
  columns: AdminCourseColumnId[]
): Promise<ActionResult> {
  const { user } = await requireStaff();
  const unique = [...new Set(columns)].filter((column): column is AdminCourseColumnId =>
    ADMIN_COURSE_COLUMN_IDS.includes(column)
  );
  if (unique.length === 0) return fail("Choose at least one course table field.");

  const supabase = await createClient();
  const { error } = await supabase.from("admin_course_preferences").upsert(
    { user_id: user.id, course_columns: unique },
    { onConflict: "user_id" }
  );
  if (error) return fail(error.message || "Could not save your table fields.");
  return { ok: true };
}

async function saveAndPublish(
  slug: string,
  publishLessons: boolean
): Promise<SlugResult> {
  await requireStaff();
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) return { ok: false, error: "That course was not found." };

  const { error } = await supabase
    .from("courses")
    .update({ status: "published" })
    .eq("id", course.id);
  if (error) return { ok: false, error: error.message || "Could not publish this course." };

  if (publishLessons) {
    await supabase.from("course_lessons").update({ status: "live" }).eq("course_id", course.id);
  }

  revalidateCourse(course.slug);
  return { ok: true, slug: course.slug, courseId: course.id, modules: await listBuilderModules(course.id) };
}

export async function publishSavedCourse(
  input: SaveCourseInput
): Promise<SlugResult> {
  const saved = await saveCourse({
    ...input,
    modules: input.modules.map((module) => ({
      ...module,
      lessons: module.lessons.map((lesson) => ({ ...lesson, status: "live" as const })),
    })),
  });
  if (!saved.ok) return saved;
  return saveAndPublish(saved.slug, true);
}

export async function deleteCourse(slug: string): Promise<ActionResult> {
  await requireStaff();

  try {
    const admin = createAdminClient();
    const { data: course, error: courseError } = await admin
      .from("courses")
      .select("id, cover_path")
      .eq("slug", slug)
      .maybeSingle();
    if (courseError) return fail(courseError.message || "Could not load this course.");
    if (!course) return fail("That course was not found.");

    const { data: lessonRows } = await admin
      .from("course_lessons")
      .select("id")
      .eq("course_id", course.id);
    const lessonIds = (lessonRows ?? []).map((row) => row.id);
    try {
      await removeLessonMediaObjects(lessonIds);
    } catch {
      /* media cleanup is best-effort */
    }

    if (course.cover_path && !isPublicCoverPath(course.cover_path)) {
      try {
        await admin.storage.from(COURSE_MEDIA_BUCKET).remove([course.cover_path]);
      } catch {
        /* cover cleanup is best-effort */
      }
    }

    const { data: certRows } = await admin
      .from("certificates")
      .select("id, storage_path")
      .eq("course_id", course.id);
    const certIds = (certRows ?? []).map((row) => row.id);
    const certPaths = (certRows ?? [])
      .map((row) => row.storage_path)
      .filter((path): path is string => Boolean(path));
    if (certPaths.length) {
      try {
        await admin.storage.from("certificates").remove(certPaths);
      } catch {
        /* certificate file cleanup is best-effort */
      }
    }

    const { data: quizRows } = await admin
      .from("quizzes")
      .select("id")
      .eq("course_id", course.id);
    const quizIds = (quizRows ?? []).map((row) => row.id);

    const wipe = async (
      error: { message: string } | null,
      fallback: string
    ): Promise<ActionResult | null> => {
      if (!error || isSkippableSchemaError(error.message)) return null;
      return deleteStepError(error.message, fallback);
    };

    // Child rows first so a missing ON DELETE CASCADE (modules, quizzes,
    // questions, invites) cannot block the course row.
    if (quizIds.length) {
      const blocked =
        (await wipe(
          (await admin.from("quiz_attempts").delete().in("quiz_id", quizIds)).error,
          "Could not delete quiz attempts."
        )) ||
        (await wipe(
          (await admin.from("quiz_questions").delete().in("quiz_id", quizIds)).error,
          "Could not delete quiz questions."
        ));
      if (blocked) return blocked;
    }
    if (certIds.length) {
      const blocked = await wipe(
        (await admin.from("certificate_revocations").delete().in("certificate_id", certIds)).error,
        "Could not delete certificate revocations."
      );
      if (blocked) return blocked;
    }

    const blocked =
      (await wipe(
        (await admin.from("certificates").delete().eq("course_id", course.id)).error,
        "Could not delete certificates."
      )) ||
      (await wipe(
        (await admin.from("course_progress").delete().eq("course_id", course.id)).error,
        "Could not delete course progress."
      )) ||
      (await wipe(
        (await admin.from("enrolment_requests").delete().eq("course_id", course.id)).error,
        "Could not delete enrolment requests."
      )) ||
      (await wipe(
        (await admin.from("enrolments").delete().eq("course_id", course.id)).error,
        "Could not delete enrolments."
      )) ||
      (await wipe(
        (
          await admin
            .from("organisation_invites")
            .update({ course_id: null })
            .eq("course_id", course.id)
        ).error,
        "Could not detach organisation invites."
      )) ||
      (quizIds.length
        ? await wipe(
            (await admin.from("quizzes").delete().in("id", quizIds)).error,
            "Could not delete quizzes."
          )
        : null) ||
      (lessonIds.length
        ? await wipe(
            (await admin.from("lesson_assets").delete().in("lesson_id", lessonIds)).error,
            "Could not delete lesson media records."
          )
        : null) ||
      (await wipe(
        (await admin.from("course_lessons").delete().eq("course_id", course.id)).error,
        "Could not delete lessons."
      )) ||
      (await wipe(
        (await admin.from("course_modules").delete().eq("course_id", course.id)).error,
        "Could not delete course modules."
      ));
    if (blocked) return blocked;

    const { error } = await admin.from("courses").delete().eq("id", course.id);
    if (error) return deleteStepError(error.message, "Could not delete this course.");

    revalidateCourse(slug);
    revalidatePath("/certificates");
    revalidatePath("/admin/reports");
    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not delete this course.");
  }
}

export async function staffEnrolLearner(
  userId: string,
  courseSlug: string
): Promise<ActionResult> {
  await requireStaff();
  return enrolLearnerWithAdmin(userId, courseSlug);
}

export async function staffEnrolByEmail(
  email: string,
  courseSlug: string
): Promise<ActionResult> {
  await requireStaff();
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@")) return fail("Enter a valid email address.");

  const admin = createAdminClient();
  const userId = await findUserIdByEmail(admin, trimmed);
  if (!userId) return fail("No account uses that email.");
  return enrolLearnerWithAdmin(userId, courseSlug);
}

export async function staffUnenrolLearner(
  userId: string,
  courseSlug: string
): Promise<ActionResult> {
  await requireStaff();
  return unenrolLearnerWithAdmin(userId, courseSlug);
}
