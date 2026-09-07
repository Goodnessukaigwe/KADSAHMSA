"use server";

import { revalidatePath } from "next/cache";

import { emptyProgress } from "@/lib/learning/progress";
import { getCourseIdBySlug } from "@/lib/learning/queries";
import { requireUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

function fail(error: string): ActionResult {
  return { ok: false, error };
}

function revalidateLearning(slug: string) {
  revalidatePath("/my");
  revalidatePath("/my/courses");
  revalidatePath(`/learn/${slug}`);
  revalidatePath(`/learn/${slug}/play`);
  revalidatePath(`/courses/${slug}`);
}

async function resolveCourseId(slug: string) {
  const courseId = await getCourseIdBySlug(slug);
  if (!courseId) {
    return { courseId: null as string | null, error: "That course is not available yet." };
  }
  return { courseId, error: null as string | null };
}

export async function enrolInCourse(slug: string): Promise<ActionResult> {
  const user = await requireUser();
  const { courseId, error } = await resolveCourseId(slug);
  if (!courseId) return fail(error ?? "That course is not available yet.");

  const supabase = await createClient();
  const { error: enrolError } = await supabase.from("enrolments").insert({
    user_id: user.id,
    course_id: courseId,
  });

  if (enrolError && enrolError.code !== "23505") {
    return fail(enrolError.message || "Could not enrol in this course.");
  }

  const { error: progressError } = await supabase.from("course_progress").insert({
    user_id: user.id,
    course_id: courseId,
    current_module: 1,
    completed_indexes: [],
    player_seconds: 0,
  });

  if (progressError && progressError.code !== "23505") {
    return fail(progressError.message || "Could not start progress for this course.");
  }

  revalidateLearning(slug);
  return { ok: true };
}

export async function markModuleComplete(
  slug: string,
  moduleIndex: number
): Promise<ActionResult> {
  const user = await requireUser();
  const enrolled = await enrolInCourse(slug);
  if (!enrolled.ok) return enrolled;

  const { courseId, error } = await resolveCourseId(slug);
  if (!courseId) return fail(error ?? "That course is not available yet.");

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("course_progress")
    .select("current_module, completed_indexes, player_seconds")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  const current = row
    ? {
        currentModule: row.current_module,
        completed: row.completed_indexes ?? [],
        playerSeconds: row.player_seconds,
      }
    : emptyProgress();

  const completed = Array.from(new Set([...current.completed, moduleIndex]));
  const currentModule = Math.max(current.currentModule, moduleIndex + 1);

  const { error: updateError } = await supabase
    .from("course_progress")
    .upsert(
      {
        user_id: user.id,
        course_id: courseId,
        current_module: currentModule,
        completed_indexes: completed,
        player_seconds: current.playerSeconds,
      },
      { onConflict: "user_id,course_id" }
    );

  if (updateError) {
    return fail(updateError.message || "Could not save progress.");
  }

  revalidateLearning(slug);
  return { ok: true };
}

export async function savePlayerSeconds(
  slug: string,
  seconds: number
): Promise<ActionResult> {
  const user = await requireUser();
  const enrolled = await enrolInCourse(slug);
  if (!enrolled.ok) return enrolled;

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
