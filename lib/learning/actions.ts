"use server";

import { revalidatePath } from "next/cache";

import { emptyProgress } from "@/lib/learning/progress";
import { isPublishedCourseAvailable } from "@/lib/courses/queries";
import { getCourseIdBySlug, isEnrolledIn } from "@/lib/learning/queries";
import { isStaffUser, requireUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

const APPLY_REQUESTS = "Apply supabase/apply-enrol-requests.sql in the dashboard, then try again.";

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function isMissingRequests(message: string | undefined) {
  return Boolean(
    message &&
      (message.includes("enrolment_requests") || message.includes("schema cache"))
  );
}

function isMissingResume(message: string | undefined) {
  return Boolean(
    message &&
      (message.includes("resume_lesson_slug") || message.includes("schema cache"))
  );
}

function progressWithoutResume(payload: {
  user_id: string;
  course_id: string;
  current_module: number;
  completed_indexes: number[];
  player_seconds: number;
  resume_lesson_slug?: string | null;
}) {
  return {
    user_id: payload.user_id,
    course_id: payload.course_id,
    current_module: payload.current_module,
    completed_indexes: payload.completed_indexes,
    player_seconds: payload.player_seconds,
  };
}

function revalidateLearning(slug: string) {
  revalidatePath("/my");
  revalidatePath("/my/courses");
  revalidatePath(`/learn/${slug}`);
  revalidatePath(`/learn/${slug}/play`);
  revalidatePath(`/courses/${slug}`);
  revalidatePath(`/admin/courses/${slug}`);
}

async function resolveCourseId(slug: string) {
  const courseId = await getCourseIdBySlug(slug);
  if (!courseId) {
    return { courseId: null as string | null, error: "That course is not available yet." };
  }
  return { courseId, error: null as string | null };
}

async function requireExistingEnrolment(slug: string): Promise<ActionResult> {
  const enrolled = await isEnrolledIn(slug);
  if (!enrolled) {
    return fail("An administrator must enrol you before you can start this course.");
  }
  return { ok: true };
}

export async function requestEnrolment(slug: string): Promise<ActionResult> {
  const user = await requireUser();
  const staff = await isStaffUser();
  const visible = staff ? true : await isPublishedCourseAvailable(slug);
  if (!visible) return fail("That course is not available yet.");

  const { courseId, error } = await resolveCourseId(slug);
  if (!courseId) return fail(error ?? "That course is not available yet.");

  if (await isEnrolledIn(slug)) return { ok: true };

  const supabase = await createClient();
  const { error: requestError } = await supabase.from("enrolment_requests").insert({
    user_id: user.id,
    course_id: courseId,
  });

  if (requestError && requestError.code !== "23505") {
    if (isMissingRequests(requestError.message)) return fail(APPLY_REQUESTS);
    return fail(requestError.message || "Could not request enrolment.");
  }

  revalidateLearning(slug);
  return { ok: true };
}

export async function markModuleComplete(
  slug: string,
  moduleIndex: number,
  resumeLessonSlug?: string | null
): Promise<ActionResult> {
  const user = await requireUser();
  const seated = await requireExistingEnrolment(slug);
  if (!seated.ok) return seated;

  const { courseId, error } = await resolveCourseId(slug);
  if (!courseId) return fail(error ?? "That course is not available yet.");

  const supabase = await createClient();
  const full = await supabase
    .from("course_progress")
    .select("current_module, completed_indexes, player_seconds, resume_lesson_slug")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();
  const row = full.error
    ? (
        await supabase
          .from("course_progress")
          .select("current_module, completed_indexes, player_seconds")
          .eq("user_id", user.id)
          .eq("course_id", courseId)
          .maybeSingle()
      ).data
    : full.data;

  const current = row
    ? {
        currentModule: row.current_module,
        completed: row.completed_indexes ?? [],
        playerSeconds: row.player_seconds,
        resumeLessonSlug:
          "resume_lesson_slug" in row
            ? ((row as { resume_lesson_slug?: string | null }).resume_lesson_slug ?? null)
            : null,
      }
    : emptyProgress();

  const completed = Array.from(new Set([...current.completed, moduleIndex]));
  const currentModule = Math.max(current.currentModule, moduleIndex + 1);
  const payload = {
    user_id: user.id,
    course_id: courseId,
    current_module: currentModule,
    completed_indexes: completed,
    player_seconds: current.playerSeconds,
    resume_lesson_slug: resumeLessonSlug ?? current.resumeLessonSlug,
  };

  let { error: updateError } = await supabase
    .from("course_progress")
    .upsert(payload, { onConflict: "user_id,course_id" });

  if (updateError && isMissingResume(updateError.message)) {
    const retry = await supabase
      .from("course_progress")
      .upsert(progressWithoutResume(payload), { onConflict: "user_id,course_id" });
    updateError = retry.error;
  }

  if (updateError) {
    return fail(updateError.message || "Could not save progress.");
  }

  revalidateLearning(slug);
  return { ok: true };
}

export async function saveResumeLesson(
  slug: string,
  lessonSlug: string,
  moduleIndex: number
): Promise<ActionResult> {
  const user = await requireUser();
  const seated = await requireExistingEnrolment(slug);
  if (!seated.ok) return { ok: true };

  const { courseId, error } = await resolveCourseId(slug);
  if (!courseId) return fail(error ?? "That course is not available yet.");

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("course_progress")
    .select("current_module, completed_indexes, player_seconds")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  const payload = {
    user_id: user.id,
    course_id: courseId,
    current_module: Math.max(row?.current_module ?? 1, moduleIndex),
    completed_indexes: row?.completed_indexes ?? [],
    player_seconds: row?.player_seconds ?? 0,
    resume_lesson_slug: lessonSlug,
  };

  let { error: updateError } = await supabase
    .from("course_progress")
    .upsert(payload, { onConflict: "user_id,course_id" });

  if (updateError && isMissingResume(updateError.message)) {
    const retry = await supabase
      .from("course_progress")
      .upsert(progressWithoutResume(payload), { onConflict: "user_id,course_id" });
    updateError = retry.error;
  }

  if (updateError) {
    return fail(updateError.message || "Could not save resume position.");
  }

  return { ok: true };
}

export async function savePlayerSeconds(
  slug: string,
  seconds: number
): Promise<ActionResult> {
  const user = await requireUser();
  const seated = await requireExistingEnrolment(slug);
  if (!seated.ok) return seated;

  const { courseId, error } = await resolveCourseId(slug);
  if (!courseId) return fail(error ?? "That course is not available yet.");

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("course_progress")
    .select("current_module, completed_indexes")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  const { error: updateError } = await supabase.from("course_progress").upsert(
    {
      user_id: user.id,
      course_id: courseId,
      current_module: row?.current_module ?? 1,
      completed_indexes: row?.completed_indexes ?? [],
      player_seconds: Math.max(0, Math.floor(seconds)),
    },
    { onConflict: "user_id,course_id" }
  );

  if (updateError) {
    return fail(updateError.message || "Could not save player position.");
  }

  revalidateLearning(slug);
  return { ok: true };
}
