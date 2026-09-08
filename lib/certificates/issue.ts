import "server-only";

import { randomBytes } from "crypto";

import { renderCertificatePdf } from "@/lib/certificates/pdf";
import { dptcCourse } from "@/lib/content/dptc";
import { liveLessonCountForSlug } from "@/lib/courses/queries";
import { displayNameFromEmail } from "@/lib/learner-session";
import { isCourseComplete } from "@/lib/learning/progress";
import { createAdminClient } from "@/lib/supabase/admin";

export type IssueResult =
  | { ok: true; verificationId: string; existing: boolean }
  | { ok: false; error: string };

function newVerificationId() {
  return `KAD-${randomBytes(8).toString("hex")}`;
}

export async function issueCertificateIfEligible(
  courseSlug: string,
  userId: string,
  scorePercent: number
): Promise<IssueResult> {
  const admin = createAdminClient();

  const { data: course } = await admin
    .from("courses")
    .select("id, title")
    .eq("slug", courseSlug)
    .maybeSingle();
  if (!course) return { ok: false, error: "That course is not available yet." };

  const { data: enrolment } = await admin
    .from("enrolments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", course.id)
    .maybeSingle();
  if (!enrolment) {
    return { ok: false, error: "Enrol in this course before a certificate can be issued." };
  }

  const { data: existing } = await admin
    .from("certificates")
    .select("verification_id")
    .eq("enrolment_id", enrolment.id)
    .maybeSingle();
  if (existing) {
    return { ok: true, verificationId: existing.verification_id, existing: true };
  }

  const { data: progress } = await admin
    .from("course_progress")
    .select("current_module, completed_indexes, player_seconds")
    .eq("user_id", userId)
    .eq("course_id", course.id)
    .maybeSingle();

  const liveCount = await liveLessonCountForSlug(courseSlug);
  const complete = isCourseComplete(
    courseSlug,
    {
      currentModule: progress?.current_module ?? 1,
      completed: progress?.completed_indexes ?? [],
      playerSeconds: progress?.player_seconds ?? 0,
    },
    liveCount
  );
  if (!complete) {
    return {
      ok: false,
      error: "Complete every live lesson before a certificate can be issued.",
    };
  }

  const { data: finalQuiz } = await admin
    .from("quizzes")
    .select("id")
    .eq("course_id", course.id)
    .eq("slug", "final")
    .maybeSingle();
  if (!finalQuiz) {
    return {
      ok: false,
      error:
        courseSlug === "dptc"
          ? "Quiz rows are missing. Apply supabase/apply-phase3.sql."
          : "This course has no final assessment, so no certificate is issued.",
    };
  }

  const { data: passedFinal } = await admin
    .from("quiz_attempts")
    .select("id, score_percent")
    .eq("user_id", userId)
    .eq("quiz_id", finalQuiz.id)
    .eq("passed", true)
    .order("score_percent", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!passedFinal) {
    return { ok: false, error: "Pass the final assessment at 70% or above." };
  }
  const storedScore = Math.max(scorePercent, passedFinal.score_percent ?? scorePercent);

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", userId)
    .maybeSingle();

  let learnerName = profile?.full_name?.trim() ?? "";
  if (!learnerName) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId);
    const metadataName =
      typeof authUser.user?.user_metadata?.full_name === "string"
        ? authUser.user.user_metadata.full_name
        : "";
    learnerName =
      metadataName.trim() || displayNameFromEmail(authUser.user?.email ?? "Learner");
  }

  const issuedAt = new Date();
  const verificationId = newVerificationId();
  const storagePath = `${userId}/${verificationId}.pdf`;
  const pdf = await renderCertificatePdf({
    learnerName,
    courseTitle: course.title,
    issuedAt,
    verificationId,
  });

  const { error: uploadError } = await admin.storage
    .from("certificates")
    .upload(storagePath, pdf, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (uploadError) {
    return { ok: false, error: uploadError.message || "Could not store the certificate PDF." };
  }

  const { data: inserted, error: insertError } = await admin
    .from("certificates")
    .insert({
      user_id: userId,
      course_id: course.id,
      enrolment_id: enrolment.id,
      verification_id: verificationId,
      score_percent: storedScore,
      issued_at: issuedAt.toISOString(),
      status: "valid",
      storage_path: storagePath,
    })
    .select("verification_id")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      const { data: raced } = await admin
        .from("certificates")
        .select("verification_id")
        .eq("enrolment_id", enrolment.id)
        .maybeSingle();
      if (raced) {
        return { ok: true, verificationId: raced.verification_id, existing: true };
      }
    }
    await admin.storage.from("certificates").remove([storagePath]);
    return { ok: false, error: insertError.message || "Could not issue the certificate." };
  }

  return { ok: true, verificationId: inserted.verification_id, existing: false };
}

export async function issueDptcCertificateIfEligible(
  userId: string,
  scorePercent: number
): Promise<IssueResult> {
  return issueCertificateIfEligible(dptcCourse.slug, userId, scorePercent);
}
