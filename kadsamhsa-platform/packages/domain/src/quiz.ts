/**
 * Quiz contracts (PRD F5, A3, §7.3).
 *
 * The learner-facing shapes deliberately omit correctness: `QuizQuestion` has
 * no `isCorrect` anywhere, because the question payload is sent to the browser
 * before the attempt is submitted. Correct answers exist only in
 * `QuizAttemptResult`, which is produced after scoring on the server.
 */

export type QuestionType = 'mcq' | 'multi' | 'true_false' | 'matching';
export type QuizKind = 'module' | 'final';

/** An option as the learner sees it — no correctness flag. */
export interface QuizOption {
  id: string;
  label: string;
  /** Right-hand term for matching questions; absent for other types. */
  matchTarget?: string;
}

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: QuizOption[];
  /** Shuffled right-hand terms for a matching question. */
  matchTargets?: string[];
}

export interface Quiz {
  id: string;
  courseId: string;
  moduleId: string | null;
  title: string;
  kind: QuizKind;
  passMarkPercent: number;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
  questionCount: number;
}

/** A started attempt: the served questions plus how many tries remain. */
export interface QuizAttempt {
  id: string;
  quiz: Quiz;
  attemptNo: number;
  attemptsRemaining: number | null;
  startedAt: string;
  /** Wall-clock deadline when the quiz is timed. */
  expiresAt: string | null;
  questions: QuizQuestion[];
}

/**
 * A learner's answer. `optionIds` covers mcq/multi/true_false; `pairs` covers
 * matching (option id → chosen right-hand term).
 */
export interface QuizResponse {
  questionId: string;
  optionIds?: string[];
  pairs?: { optionId: string; matchTarget: string }[];
}

export interface QuizQuestionResult {
  questionId: string;
  prompt: string;
  isCorrect: boolean;
  feedback: string;
  correctOptionIds: string[];
}

export interface QuizAttemptResult {
  attemptId: string;
  scorePercent: number;
  passed: boolean;
  passMarkPercent: number;
  correctCount: number;
  totalCount: number;
  attemptsRemaining: number | null;
  submittedAt: string;
  questions: QuizQuestionResult[];
  /** Set when this submission completed the course and issued a certificate. */
  certificateVerificationId?: string;
}

/** Per-quiz state for the course outline. */
export interface QuizStatus {
  quizId: string;
  title: string;
  kind: QuizKind;
  moduleId: string | null;
  attemptsUsed: number;
  attemptsRemaining: number | null;
  bestScorePercent: number | null;
  passed: boolean;
  /** False when earlier required content is still incomplete. */
  unlocked: boolean;
}
