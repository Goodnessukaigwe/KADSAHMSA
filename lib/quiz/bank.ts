import "server-only";

import {
  finalQuiz,
  finalQuizMeta,
  module1Quiz,
  quizMeta,
  toPublicQuestions,
  type PublicQuizQuestion,
  type QuizQuestion,
} from "@/lib/content/dptc";
import type { QuizSlug } from "@/lib/domain";
import { loadScoringQuestions } from "@/lib/quiz/queries";

export type QuizBank = {
  slug: QuizSlug;
  title: string;
  seconds: number;
  maxAttempts: number;
  passMark: number;
  questions: QuizQuestion[];
};

const banks: Record<QuizSlug, QuizBank> = {
  "module-1": {
    slug: "module-1",
    title: quizMeta.title,
    seconds: quizMeta.seconds,
    maxAttempts: quizMeta.maxAttempts,
    passMark: quizMeta.passMark,
    questions: module1Quiz,
  },
  final: {
    slug: "final",
    title: finalQuizMeta.title,
    seconds: finalQuizMeta.seconds,
    maxAttempts: finalQuizMeta.maxAttempts,
    passMark: finalQuizMeta.passMark,
    questions: finalQuiz,
  },
};

export function getQuizBank(slug: QuizSlug): QuizBank {
  return banks[slug];
}

export function publicBankQuestions(slug: QuizSlug): PublicQuizQuestion[] {
  return toPublicQuestions(banks[slug].questions);
}

export type ScoringQuestion = {
  options: string[];
  correctIndex: number;
};

export function scoreQuestions(
  questions: ScoringQuestion[],
  passMark: number,
  answers: Array<number | null>
) {
  const correctIndexes = questions.map((question) => question.correctIndex);
  const correctCount = questions.filter(
    (question, index) => answers[index] === question.correctIndex
  ).length;
  const score = questions.length
    ? Math.round((correctCount / questions.length) * 100)
    : 0;
  return {
    score,
    passed: score >= passMark,
    correctIndexes,
    passMark,
  };
}

export function normalizeQuestionAnswers(
  questions: ScoringQuestion[],
  answers: unknown
): number[] | null {
  if (!Array.isArray(answers) || answers.length !== questions.length) {
    return null;
  }
  const next: number[] = [];
  for (let i = 0; i < answers.length; i += 1) {
    const value = answers[i];
    const optionCount = questions[i]?.options.length ?? 0;
    if (value == null) {
      next.push(-1);
      continue;
    }
    if (
      typeof value !== "number" ||
      !Number.isInteger(value) ||
      value < 0 ||
      value >= optionCount
    ) {
      return null;
    }
    next.push(value);
  }
  return next;
}

export function scoreAnswers(slug: QuizSlug, answers: Array<number | null>) {
  const { questions, passMark } = banks[slug];
  return scoreQuestions(
    questions.map((question) => ({
      options: [...question.options],
      correctIndex: question.correctIndex,
    })),
    passMark,
    answers
  );
}

export function normalizeAnswers(slug: QuizSlug, answers: unknown): number[] | null {
  const { questions } = banks[slug];
  return normalizeQuestionAnswers(
    questions.map((question) => ({
      options: [...question.options],
      correctIndex: question.correctIndex,
    })),
    answers
  );
}

export async function loadBankForScoring(courseSlug: string, quizSlug: string) {
  return loadScoringQuestions(courseSlug, quizSlug);
}
