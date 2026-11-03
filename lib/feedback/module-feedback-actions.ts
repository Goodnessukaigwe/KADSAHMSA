"use server";

import { revalidatePath } from "next/cache";

import { moduleFeedbackEnabled } from "@/lib/feedback/module-feedback";
import { getCourseIdBySlug } from "@/lib/learning/queries";
import { isStaffUser, requireUser } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

/** True when the learner should be asked about this module now. */
export async function needsModuleFeedback(courseSlug: string, moduleIndex: number): Promise<boolean> {
  if (!moduleFeedbackEnabled()) return false;
  const user = await requireUser();
  if (await isStaffUser()) return false;
  const courseId = await getCourseIdBySlug(courseSlug);
  if (!courseId) return false;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("module_feedback")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .eq("module_index", moduleIndex)
    .maybeSingle();
  // A missing table means the feature is not switched on yet.
  if (error) return false;
  return !data;
}

export type ModuleFeedbackInput = {
  courseSlug: string;
  moduleIndex: number;
  rating: number;
  comment: string;
  pagePath: string;
};

export async function submitModuleFeedback(
  input: ModuleFeedbackInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return { ok: false, error: "Please give a rating from 1 to 5 stars." };
  }
  if (!Number.isInteger(input.moduleIndex) || input.moduleIndex < 0) {
    return { ok: false, error: "That module was not found." };
  }
  const courseId = await getCourseIdBySlug(input.courseSlug);
  if (!courseId) return { ok: false, error: "That course was not found." };

  const admin = createAdminClient();
  const { error } = await admin.from("module_feedback").upsert(
    {
      user_id: user.id,
      course_id: courseId,
      module_index: input.moduleIndex,
      rating: input.rating,
      comment: input.comment.trim().slice(0, 1000),
      page_path: input.pagePath.slice(0, 300),
    },
    { onConflict: "user_id,course_id,module_index" }
  );
  if (error) return { ok: false, error: "Could not save your feedback. Please try again." };
  revalidatePath("/certificates");
  revalidatePath("/admin/course-feedback");
  return { ok: true };
}
