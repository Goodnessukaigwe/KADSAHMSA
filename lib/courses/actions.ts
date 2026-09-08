"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { findUserIdByEmail } from "@/lib/auth/admin-users";
import { removeLessonMediaObjects } from "@/lib/courses/asset-actions";
import { enrolLearnerWithAdmin } from "@/lib/courses/enrol";
import { COURSE_MEDIA_BUCKET, isPublicCoverPath, isStockLandingCover } from "@/lib/courses/media";
import { listBuilderLessons } from "@/lib/courses/queries";
import type { BuilderLesson, BuilderQuizQuestion, LessonStatus } from "@/lib/courses/types";
import { requireStaff } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type SlugResult =
  | { ok: true; slug: string; lessons: BuilderLesson[] }
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

export async function createDraftCourse(): Promise<void> {
  await requireStaff();
  const supabase = await createClient();
  const slug = await uniqueSlug(`untitled-${Date.now().toString(36)}`);
  const { error } = await supabase.from("courses").insert({
    slug,
    title: "Untitled course",
    status: "draft",
    summary: "",
    duration_label: "",
    cover_path: "",
  });
  if (error) {
    throw new Error(error.message || "Could not create a course.");
  }
  revalidateCourse(slug);
  redirect(`/admin/courses/${slug}`);
}

export type SaveCourseInput = {
  slug: string;
  title: string;
  nextSlug?: string;
  summary?: string;
  durationLabel?: string;
  coverPath?: string;
  lessons: BuilderLesson[];
  finalQuestions?: BuilderQuizQuestion[];
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
    const { error } = await supabase
      .from("courses")
      .update({
        title,
        slug,
        summary: input.summary?.trim() ?? "",
        duration_label: input.durationLabel?.trim() ?? "",
        cover_path: usableCoverPath(input.coverPath),
      })
      .eq("id", existing.id);
    if (error) {
      return { ok: false, error: error.message || "Could not save this course." };
    }
  }

  const lessonError = await replaceLessons(courseId, input.lessons);
  if (lessonError) return { ok: false, error: lessonError };

  if (slug !== "dptc") {
    const quizError = await replaceFinalQuiz(courseId, input.finalQuestions ?? []);
    if (quizError) return { ok: false, error: quizError };
  }

  revalidateCourse(input.slug);
  revalidateCourse(slug);
  return { ok: true, slug, lessons: await listBuilderLessons(courseId) };
}

async function replaceLessons(courseId: string, lessons: BuilderLesson[]) {
  const supabase = await createClient();
  const seen = new Set<string>();
  const rows = lessons.map((lesson, index) => {
    let slug = slugFromTitle(lesson.slug || lesson.title) || `lesson-${index + 1}`;
    if (seen.has(slug)) slug = `${slug}-${index + 1}`;
    seen.add(slug);
    const status: LessonStatus = lesson.status === "live" ? "live" : "draft";
    return {
      course_id: courseId,
      position: index + 1,
      slug,
      title: lesson.title.trim() || `Untitled module ${index + 1}`,
      status,
      duration_label: lesson.duration.trim(),
      introduction: lesson.introduction,
      main: lesson.main,
      notes: lesson.notes,
    };
  });

  const { data: existing } = await supabase
    .from("course_lessons")
    .select("id, slug")
    .eq("course_id", courseId);
  const existingBySlug = new Map((existing ?? []).map((row) => [row.slug, row.id]));
  const keepSlugs = new Set(rows.map((row) => row.slug));

  for (const row of rows) {
    const id = existingBySlug.get(row.slug);
    if (id) {
      const { error } = await supabase.from("course_lessons").update(row).eq("id", id);
      if (error) return error.message || "Could not save a lesson.";
    } else {
      const { error } = await supabase.from("course_lessons").insert(row);
      if (error) return error.message || "Could not save a lesson.";
    }
  }

  const stale = (existing ?? []).filter((row) => !keepSlugs.has(row.slug)).map((row) => row.id);
  if (stale.length) {
    await removeLessonMediaObjects(stale);
    const { error } = await supabase.from("course_lessons").delete().in("id", stale);
    if (error) return error.message || "Could not remove a dropped lesson.";
  }
  return null;
}

async function replaceFinalQuiz(courseId: string, questions: BuilderQuizQuestion[]) {
  const admin = createAdminClient();
  const cleaned = questions
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
        time_limit_seconds: 1800,
      })
      .select("id")
      .single();
    if (error || !data) return error?.message || "Could not save the final quiz.";
    quizId = data.id;
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

export async function publishCourse(slug: string): Promise<SlugResult> {
  const saved = await saveAndPublish(slug, true);
  return saved;
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
  return { ok: true, slug: course.slug, lessons: await listBuilderLessons(course.id) };
}

export async function publishSavedCourse(
  input: SaveCourseInput
): Promise<SlugResult> {
  const saved = await saveCourse({
    ...input,
    lessons: input.lessons.map((lesson) => ({ ...lesson, status: "live" })),
  });
  if (!saved.ok) return saved;
  return saveAndPublish(saved.slug, true);
}

export async function deleteCourse(slug: string): Promise<ActionResult> {
  await requireStaff();
  if (slug === "dptc") {
    return fail("The DPTC course cannot be deleted.");
  }
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, cover_path")
    .eq("slug", slug)
    .maybeSingle();
  if (!course) return fail("That course was not found.");

  const { count } = await supabase
    .from("enrolments")
    .select("id", { count: "exact", head: true })
    .eq("course_id", course.id);
  if ((count ?? 0) > 0) {
    return fail(
      "This course still has enrolments. Remove those first — delete will not cascade."
    );
  }

  const { data: lessonRows } = await supabase
    .from("course_lessons")
    .select("id")
    .eq("course_id", course.id);
  await removeLessonMediaObjects((lessonRows ?? []).map((row) => row.id));
  if (course.cover_path && !isPublicCoverPath(course.cover_path)) {
    try {
      const admin = createAdminClient();
      await admin.storage.from(COURSE_MEDIA_BUCKET).remove([course.cover_path]);
    } catch {
      /* cover cleanup is best-effort */
    }
  }

  const { error } = await supabase.from("courses").delete().eq("id", course.id);
  if (error) return fail(error.message || "Could not delete this course.");

  revalidateCourse(slug);
  return { ok: true };
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
