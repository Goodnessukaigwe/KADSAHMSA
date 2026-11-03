"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type SurveyInput = {
  certificateId: string;
  overall: number;
  easeOfUse: number;
  contentQuality: number;
  mobileExperience: number;
  recommend: number;
  enjoyed: string;
  improve: string;
  hadProblems: boolean;
  problems: string;
  /** Quick answers for modules finished without feedback. */
  modules?: { index: number; rating: number; comment: string }[];
};

export type SurveyResult = { ok: true } | { ok: false; error: string };

const stars = (value: number) => Number.isInteger(value) && value >= 1 && value <= 5;

/** Saves the learner's survey for the course a certificate belongs to. */
export async function submitCourseSurvey(input: SurveyInput): Promise<SurveyResult> {
  const user = await requireUser();
  if (
    !stars(input.overall) ||
    !stars(input.easeOfUse) ||
    !stars(input.contentQuality) ||
    !stars(input.mobileExperience)
  ) {
    return { ok: false, error: "Please rate each question from 1 to 5 stars." };
  }
  if (!Number.isInteger(input.recommend) || input.recommend < 0 || input.recommend > 10) {
    return { ok: false, error: "Please say how likely you are to recommend the academy (0 to 10)." };
  }

  const admin = createAdminClient();
  const { data: cert } = await admin
    .from("certificates")
    .select("course_id")
    .eq("id", input.certificateId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!cert) return { ok: false, error: "That certificate is not on this account." };

  const clip = (text: string) => text.trim().slice(0, 2000);
  const { error } = await admin.from("course_feedback").upsert(
    {
      user_id: user.id,
      course_id: cert.course_id,
      overall: input.overall,
      ease_of_use: input.easeOfUse,
      content_quality: input.contentQuality,
      mobile_experience: input.mobileExperience,
      recommend: input.recommend,
      enjoyed: clip(input.enjoyed),
      improve: clip(input.improve),
      had_problems: input.hadProblems,
      problems: input.hadProblems ? clip(input.problems) : "",
    },
    { onConflict: "user_id,course_id" }
  );
  if (error) return { ok: false, error: "Could not save your feedback. Please try again." };

  for (const item of input.modules ?? []) {
    if (!Number.isInteger(item.index) || !stars(item.rating)) {
      return { ok: false, error: "Please rate every module from 1 to 5 stars." };
    }
    const { error: moduleError } = await admin.from("module_feedback").upsert(
      {
        user_id: user.id,
        course_id: cert.course_id,
        module_index: item.index,
        rating: item.rating,
        comment: clip(item.comment).slice(0, 1000),
        page_path: "certificate form",
      },
      { onConflict: "user_id,course_id,module_index" }
    );
    if (moduleError) return { ok: false, error: "Could not save your module feedback. Please try again." };
  }

  revalidatePath("/certificates");
  revalidatePath("/admin/course-feedback");
  return { ok: true };
}
