import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Which courses this learner has already given survey feedback on.
 * `ready` is false until the course_feedback table exists, so nobody is locked out of a
 * certificate before the database update has been applied.
 */
export async function getSurveyStatus(userId: string, courseIds: string[]) {
  if (courseIds.length === 0) return { ready: true, done: new Set<string>() };
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("course_feedback")
    .select("course_id")
    .eq("user_id", userId)
    .in("course_id", courseIds);
  if (error) return { ready: false, done: new Set<string>() };
  return { ready: true, done: new Set((data ?? []).map((row) => row.course_id)) };
}
