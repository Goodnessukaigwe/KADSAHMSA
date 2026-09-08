"use server";

import { revalidatePath } from "next/cache";

import { issueCertificateIfEligible } from "@/lib/certificates/issue";
import { isQuizSlug } from "@/lib/domain";
import { isCourseComplete } from "@/lib/learning/progress";
import { liveLessonCountForSlug } from "@/lib/courses/queries";
import { getCourseIdBySlug, getMyProgress, isEnrolledIn } from "@/lib/learning/queries";
import { requireUser } from "@/lib/permissions";
import { loadBankForScoring, normalizeQuestionAnswers, scoreQuestions } from "@/lib/quiz/bank";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type StartAttemptResult =
  | {
      ok: true;
      attemptId: string;
      attemptNo: number;
      attemptsUsed: number;
      maxAttempts: number;
    }
  | { ok: false; error: string };

export type SubmitAttemptResult =
  | {
      ok: true;
      score: number;
      passed: boolean;
      correctIndexes: number[];
      attemptsUsed: number;
      maxAttempts: number;
      verificationId?: string;
    }
  | { ok: false; error: string };

type QuizContext = {
  userId: string;
  courseId: string;
  courseSlug: string;
  enrolmentId: string;
  quiz: {
    id: string;
    slug: string;
    max_attempts: number;
    pass_mark_percent: number;
  };
};

async function failStart(error: string): Promise<StartAttemptResult> {
  return { ok: false, error };
}

async function failSubmit(error: string): Promise<SubmitAttemptResult> {
  return { ok: false, error };
}

async function loadQuizContext(
  courseSlug: string,
  quizSlug: string
): Promise<{ ok: true; ctx: QuizContext } | { ok: false; error: string }> {
  const user = await requireUser();
  if (!(await isEnrolledIn(courseSlug))) {
    return {
      ok: false,
      error: "An administrator must enrol you before you can take this quiz.",
    };
  }

  const courseId = await getCourseIdBySlug(courseSlug);
  if (!courseId) return { ok: false, error: "That course is not available yet." };

  const supabase = await createClient();
  const { data: enrolment } = await supabase
    .from("enrolments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();
  if (!enrolment) return { ok: false, error: "Enrol in this course before taking the quiz." };

  if (quizSlug === "final") {
    const progress = await getMyProgress(courseSlug);
    const liveCount = await liveLessonCountForSlug(courseSlug);
    if (!isCourseComplete(courseSlug, progress, liveCount)) {
      return {
        ok: false,
        error: "The final assessment unlocks after you complete every live lesson.",
      };
    }
  }

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, slug, max_attempts, pass_mark_percent")
    .eq("course_id", courseId)
    .eq("slug", quizSlug)
    .maybeSingle();
  if (!quiz) {
    return {
      ok: false,
      error:
        courseSlug === "dptc"
          ? "Quiz rows are missing. Apply supabase/apply-phase3.sql in the dashboard."
          : "This course has no assessment yet.",
    };
  }

  return {
    ok: true,
    ctx: {
      userId: user.id,
      courseId,
      courseSlug,
      enrolmentId: enrolment.id,
      quiz: {
        id: quiz.id,
        slug: quiz.slug,
        max_attempts: quiz.max_attempts,
        pass_mark_percent: quiz.pass_mark_percent,
      },
    },
  };
}

function revalidateQuizPaths(courseSlug: string) {
  revalidatePath("/quiz");
  revalidatePath("/certificates");
  revalidatePath("/my");
  revalidatePath("/my/courses");
  revalidatePath(`/learn/${courseSlug}`);
  revalidatePath(`/learn/${courseSlug}/quiz`);
  revalidatePath(`/learn/${courseSlug}/final`);
}

export async function startAttempt(
  courseSlug: string,
  quizSlug: string
): Promise<StartAttemptResult> {
  if (!isQuizSlug(quizSlug)) return failStart("That quiz is not available.");
  const loaded = await loadQuizContext(courseSlug, quizSlug);
  if (!loaded.ok) return failStart(loaded.error);

  const { ctx } = loaded;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("quiz_attempts")
    .select("id, attempt_no, submitted_at")
    .eq("user_id", ctx.userId)
    .eq("quiz_id", ctx.quiz.id)
    .order("attempt_no", { ascending: false });

  const submitted = (rows ?? []).filter((row) => row.submitted_at);
  const draft = (rows ?? []).find((row) => !row.submitted_at);
  if (draft) {
    return {
      ok: true,
      attemptId: draft.id,
      attemptNo: draft.attempt_no,
      attemptsUsed: submitted.length,
      maxAttempts: ctx.quiz.max_attempts,
    };
  }

  if (submitted.length >= ctx.quiz.max_attempts) {
    return failStart("You have used all three attempts for this quiz.");
  }

  const attemptNo = (rows?.[0]?.attempt_no ?? 0) + 1;
  const { data: created, error } = await supabase
    .from("quiz_attempts")
    .insert({
      user_id: ctx.userId,
      quiz_id: ctx.quiz.id,
      enrolment_id: ctx.enrolmentId,
      attempt_no: attemptNo,
    })
    .select("id, attempt_no")
    .single();

  if (error || !created) {
    return failStart(error?.message || "Could not start this attempt.");
  }

  return {
    ok: true,
    attemptId: created.id,
    attemptNo: created.attempt_no,
    attemptsUsed: submitted.length,
    maxAttempts: ctx.quiz.max_attempts,
  };
}

export async function submitAttempt(
  courseSlug: string,
  quizSlug: string,
  answers: Array<number | null>
): Promise<SubmitAttemptResult> {
  if (!isQuizSlug(quizSlug)) return failSubmit("That quiz is not available.");
  const loaded = await loadQuizContext(courseSlug, quizSlug);
  if (!loaded.ok) return failSubmit(loaded.error);

  const bank = await loadBankForScoring(courseSlug, quizSlug);
  if (!bank) {
    return failSubmit("This course has no assessment yet.");
  }

  const normalized = normalizeQuestionAnswers(bank.questions, answers);
  if (!normalized) {
    return failSubmit("Answer every question with one of the listed options.");
  }

  const { ctx } = loaded;
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("quiz_attempts")
    .select("id, attempt_no, submitted_at")
    .eq("user_id", ctx.userId)
    .eq("quiz_id", ctx.quiz.id)
    .order("attempt_no", { ascending: false });

  const submitted = (rows ?? []).filter((row) => row.submitted_at);
  if (submitted.length >= ctx.quiz.max_attempts) {
    return failSubmit("You have used all three attempts for this quiz.");
  }

  let attemptId = (rows ?? []).find((row) => !row.submitted_at)?.id;
  if (!attemptId) {
    const started = await startAttempt(courseSlug, quizSlug);
    if (!started.ok) return failSubmit(started.error);
    attemptId = started.attemptId;
  }

  const result = scoreQuestions(bank.questions, ctx.quiz.pass_mark_percent, normalized);
  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("quiz_attempts")
    .update({
      answers: normalized,
      score_percent: result.score,
      passed: result.passed,
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("user_id", ctx.userId)
    .is("submitted_at", null);

  if (updateError) {
    return failSubmit(updateError.message || "Could not save this attempt.");
  }

  let verificationId: string | undefined;
  if (quizSlug === "final" && result.passed) {
    const issued = await issueCertificateIfEligible(courseSlug, ctx.userId, result.score);
    if (issued.ok) verificationId = issued.verificationId;
  }

  revalidateQuizPaths(courseSlug);
  return {
    ok: true,
    score: result.score,
    passed: result.passed,
    correctIndexes: result.correctIndexes,
    attemptsUsed: submitted.length + 1,
    maxAttempts: bank.maxAttempts,
    verificationId,
  };
}
