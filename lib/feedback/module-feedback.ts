import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Set MODULE_FEEDBACK=off to stop the after-module pop-up and its certificate requirement. */
export function moduleFeedbackEnabled() {
  return process.env.MODULE_FEEDBACK?.trim().toLowerCase() !== "off";
}

/**
 * Modules a learner has finished but not yet left feedback on, per course.
 * Returns an empty map until the module_feedback table exists, so nobody is locked out early.
 */
export async function getMissingModuleFeedback(userId: string, courseIds: string[]) {
  const missing = new Map<string, number[]>();
  if (!moduleFeedbackEnabled() || courseIds.length === 0) return missing;

  const admin = createAdminClient();
  const [{ data: progress }, { data: given, error }] = await Promise.all([
    admin
      .from("course_progress")
      .select("course_id, completed_indexes")
      .eq("user_id", userId)
      .in("course_id", courseIds),
    admin
      .from("module_feedback")
      .select("course_id, module_index")
      .eq("user_id", userId)
      .in("course_id", courseIds),
  ]);
  if (error) return missing;

  const have = new Set((given ?? []).map((row) => `${row.course_id}:${row.module_index}`));
  for (const row of progress ?? []) {
    const todo = [...new Set(row.completed_indexes ?? [])]
      .filter((index) => !have.has(`${row.course_id}:${index}`))
      .sort((a, b) => a - b);
    if (todo.length > 0) missing.set(row.course_id, todo);
  }
  return missing;
}
