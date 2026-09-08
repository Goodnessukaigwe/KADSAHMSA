import "server-only";

import {
  finalQuiz,
  finalQuizMeta,
  module1Quiz,
  quizMeta,
  toPublicQuestions,
  type PublicQuizQuestion,
} from "@/lib/content/dptc";
import { isDptcBankSlug } from "@/lib/domain";
import { getAuthUser } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type QuizAttemptRow = {
  id: string;
  quizSlug: string;
  quizTitle: string;
  courseSlug: string;
  attemptNo: number;
  scorePercent: number;
  passed: boolean;
  submittedAt: string;
};

export type QuizResultsView = {
  attempts: QuizAttemptRow[];
  taken: number;
  passed: number;
  retry: number;
  average: number;
};

export type PublicQuizView = {
  quizId: string;
  title: string;
  seconds: number;
  maxAttempts: number;
  passMark: number;
  questions: PublicQuizQuestion[];
};

function dptcTitle(quizSlug: string) {
  if (quizSlug === "module-1") return quizMeta.title;
  if (quizSlug === "final") return finalQuizMeta.title;
  return "Quiz";
}

export async function courseHasFinalQuiz(courseId: string, courseSlug: string) {
  if (courseSlug === "dptc") return true;
  const supabase = await createClient();
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select("id")
    .eq("course_id", courseId)
    .eq("slug", "final")
    .maybeSingle();
  if (error || !quiz) return false;

  const { count, error: countError } = await supabase
    .from("quiz_questions")
    .select("id", { count: "exact", head: true })
    .eq("quiz_id", quiz.id);
  if (countError) return false;
  return (count ?? 0) > 0;
}

export async function getPublicQuiz(
  courseSlug: string,
  quizSlug: string
): Promise<PublicQuizView | null> {
  const supabase = await createClient();
  const { data: course } = await supabase
    .from("courses")
    .select("id, title")
    .eq("slug", courseSlug)
    .maybeSingle();
  if (!course) return null;

  const { data: quiz } = await supabase
    .from("quizzes")
    .select("id, slug, max_attempts, pass_mark_percent, time_limit_seconds")
    .eq("course_id", course.id)
    .eq("slug", quizSlug)
    .maybeSingle();
  if (!quiz) return null;

  if (isDptcBankSlug(courseSlug, quizSlug)) {
    const bank = quizSlug === "final" ? finalQuiz : module1Quiz;
    const meta = quizSlug === "final" ? finalQuizMeta : quizMeta;
    return {
      quizId: quiz.id,
      title: meta.title,
      seconds: quiz.time_limit_seconds ?? meta.seconds,
      maxAttempts: quiz.max_attempts,
      passMark: quiz.pass_mark_percent,
      questions: toPublicQuestions(bank),
    };
  }

  const { data: rows, error } = await supabase
    .from("quiz_questions")
    .select("id, prompt, options")
    .eq("quiz_id", quiz.id)
    .order("position", { ascending: true });
  if (error || !rows?.length) return null;

  return {
    quizId: quiz.id,
    title:
      quizSlug === "final" ? `${course.title} — Final assessment` : `${course.title} quiz`,
    seconds: quiz.time_limit_seconds ?? 1800,
    maxAttempts: quiz.max_attempts,
    passMark: quiz.pass_mark_percent,
    questions: rows.map((row) => ({
      id: row.id,
      prompt: row.prompt,
      options: (row.options ?? []).slice(0, 6),
    })),
  };
}

export async function listMyQuizAttempts(): Promise<QuizResultsView> {
  const user = await getAuthUser();
  if (!user) {
    return { attempts: [], taken: 0, passed: 0, retry: 0, average: 0 };
  }

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("quiz_attempts")
    .select("id, quiz_id, attempt_no, score_percent, passed, submitted_at")
    .eq("user_id", user.id)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false });
  if (!rows?.length) {
    return { attempts: [], taken: 0, passed: 0, retry: 0, average: 0 };
  }

  const quizIds = [...new Set(rows.map((row) => row.quiz_id))];
  const { data: quizzes } = await supabase
    .from("quizzes")
    .select("id, slug, kind, course_id")
    .in("id", quizIds);
  const courseIds = [...new Set((quizzes ?? []).map((quiz) => quiz.course_id))];
  const { data: courses } = courseIds.length
    ? await supabase.from("courses").select("id, slug, title").in("id", courseIds)
    : { data: [] as { id: string; slug: string; title: string }[] };

  const quizById = new Map((quizzes ?? []).map((quiz) => [quiz.id, quiz]));
  const courseById = new Map((courses ?? []).map((course) => [course.id, course]));

  const attempts: QuizAttemptRow[] = rows.flatMap((row) => {
    const quiz = quizById.get(row.quiz_id);
    if (!quiz || row.score_percent == null || !row.submitted_at) return [];
    const course = courseById.get(quiz.course_id);
    const courseSlug = course?.slug ?? "";
    const title = isDptcBankSlug(courseSlug, quiz.slug)
      ? dptcTitle(quiz.slug)
      : quiz.kind === "final"
        ? `${course?.title ?? "Course"} — Final assessment`
        : `${course?.title ?? "Course"} quiz`;
    return [
      {
        id: row.id,
        quizSlug: quiz.slug,
        quizTitle: title,
        courseSlug,
        attemptNo: row.attempt_no,
        scorePercent: row.score_percent,
        passed: Boolean(row.passed),
        submittedAt: row.submitted_at,
      },
    ];
  });

  const byKey = new Map<string, QuizAttemptRow[]>();
  for (const attempt of attempts) {
    const key = `${attempt.courseSlug}:${attempt.quizSlug}`;
    const list = byKey.get(key) ?? [];
    list.push(attempt);
    byKey.set(key, list);
  }

  let passed = 0;
  let retry = 0;
  const latestScores: number[] = [];
  for (const list of byKey.values()) {
    const newest = list[0];
    latestScores.push(newest.scorePercent);
    if (list.some((item) => item.passed)) passed += 1;
    else retry += 1;
  }

  const average =
    latestScores.length === 0
      ? 0
      : Math.round(latestScores.reduce((sum, score) => sum + score, 0) / latestScores.length);

  return {
    attempts,
    taken: byKey.size,
    passed,
    retry,
    average,
  };
}

export async function countSubmittedAttempts(userId: string, quizId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("quiz_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("quiz_id", quizId)
    .not("submitted_at", "is", null);
  return count ?? 0;
}

export async function loadScoringQuestions(courseSlug: string, quizSlug: string) {
  if (isDptcBankSlug(courseSlug, quizSlug)) {
    const bank = quizSlug === "final" ? finalQuiz : module1Quiz;
    const meta = quizSlug === "final" ? finalQuizMeta : quizMeta;
    return {
      title: meta.title,
      seconds: meta.seconds,
      maxAttempts: meta.maxAttempts,
      passMark: meta.passMark,
      questions: bank.map((question) => ({
        options: [...question.options],
        correctIndex: question.correctIndex,
      })),
    };
  }

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id")
    .eq("slug", courseSlug)
    .maybeSingle();
  if (!course) return null;

  const { data: quiz } = await admin
    .from("quizzes")
    .select("id, max_attempts, pass_mark_percent, time_limit_seconds")
    .eq("course_id", course.id)
    .eq("slug", quizSlug)
    .maybeSingle();
  if (!quiz) return null;

  const { data: rows } = await admin
    .from("quiz_questions")
    .select("options, correct_index")
    .eq("quiz_id", quiz.id)
    .order("position", { ascending: true });
  if (!rows?.length) return null;

  return {
    title: "Final assessment",
    seconds: quiz.time_limit_seconds ?? 1800,
    maxAttempts: quiz.max_attempts,
    passMark: quiz.pass_mark_percent,
    questions: rows.map((row) => ({
      options: row.options ?? [],
      correctIndex: row.correct_index,
    })),
  };
}
