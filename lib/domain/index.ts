/**
 * Product rules for enrolment, quizzes, and certificates.
 * Schema starter: PHASES_v2.md “Domain model starter” / PRD §8.4.
 * Implemented from Phase 2 onward.
 */

export const DEFAULT_PASS_MARK = 70;
export const DEFAULT_MAX_ATTEMPTS = 3;

export const QUIZ_SLUGS = ["module-1", "final"] as const;
export type QuizSlug = (typeof QUIZ_SLUGS)[number];

export function isQuizSlug(value: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value) && value.length <= 64;
}

export function isDptcBankSlug(courseSlug: string, quizSlug: string): quizSlug is QuizSlug {
  return courseSlug === "dptc" && (QUIZ_SLUGS as readonly string[]).includes(quizSlug);
}
