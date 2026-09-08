import { dptcModules } from "@/lib/content/dptc";
import {
  continueHref as continueHrefFromProgress,
  emptyProgress,
  progressPercent,
  type CourseProgress as DbCourseProgress,
} from "@/lib/learning/progress";

export const LEARNER_KEY = "kadsamhsa.learner";
export const ENROLLED_KEY = "kadsamhsa.enrolled";
export const ONBOARDING_KEY = "kadsamhsa.onboarding.v1";
export const NAMES_KEY = "kadsamhsa.learner.names";
export const RETURNING_KEY = "kadsamhsa.returning";
export const PROGRESS_KEY = "kadsamhsa.progress";
export const QUIZ_KEY = "kadsamhsa.quiz.dptc.m1";
export const QUIZ_KEY_PREFIX = "kadsamhsa.quiz.dptc.";
export const CERTS_KEY = "kadsamhsa.certificates";
export const PLAYER_KEY = "kadsamhsa.player";
export const TIME_KEY = "kadsamhsa.time";

export type Learner = {
  name: string;
  email: string;
};

function readJson<T>(key: string, storage: Storage | null): T | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function sessionStore() {
  return typeof window === "undefined" ? null : sessionStorage;
}

function localStore() {
  return typeof window === "undefined" ? null : localStorage;
}

export function saveLearner(learner: Learner) {
  sessionStore()?.setItem(LEARNER_KEY, JSON.stringify(learner));
  rememberLearnerName(learner.email, learner.name);
}

export function getLearner(): Learner | null {
  const value = readJson<Learner>(LEARNER_KEY, sessionStore());
  if (!value?.email) return null;
  return {
    name: value.name?.trim() || value.email.split("@")[0] || "Learner",
    email: value.email,
  };
}

export function clearLearner() {
  sessionStore()?.removeItem(LEARNER_KEY);
  sessionStore()?.removeItem(ENROLLED_KEY);
  sessionStore()?.removeItem(ONBOARDING_KEY);
  sessionStore()?.removeItem(RETURNING_KEY);
  sessionStore()?.removeItem(PROGRESS_KEY);
  sessionStore()?.removeItem(QUIZ_KEY);
  sessionStore()?.removeItem(CERTS_KEY);
  sessionStore()?.removeItem(PLAYER_KEY);
  sessionStore()?.removeItem(TIME_KEY);
}

export function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0] || "Learner";
}

export function displayNameFromEmail(email: string) {
  const local = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() || "Learner";
  return local
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function rememberLearnerName(email: string, name: string) {
  const store = localStore();
  if (!store) return;
  const dir = readJson<Record<string, string>>(NAMES_KEY, store) ?? {};
  dir[email.trim().toLowerCase()] = name.trim();
  store.setItem(NAMES_KEY, JSON.stringify(dir));
}

export function recallLearnerName(email: string) {
  const dir = readJson<Record<string, string>>(NAMES_KEY, localStore()) ?? {};
  return dir[email.trim().toLowerCase()] || null;
}

export function getEnrolled(): string[] {
  return readJson<string[]>(ENROLLED_KEY, sessionStore()) ?? [];
}

export function enrollCourse(slug: string) {
  const next = Array.from(new Set([...getEnrolled(), slug]));
  sessionStore()?.setItem(ENROLLED_KEY, JSON.stringify(next));
}

export function isOnboardingDone() {
  return sessionStore()?.getItem(ONBOARDING_KEY) === "done";
}

export function completeOnboarding() {
  sessionStore()?.setItem(ONBOARDING_KEY, "done");
}

export function markReturningLearner() {
  completeOnboarding();
  enrollCourse("dptc");
  enrollCourse("human-rights-law-enforcement");
  enrollCourse("community-first-response");
  setCourseProgress("dptc", {
    currentModule: 9,
    completed: [1, 2, 3, 4, 5, 6, 7, 8],
  });
  setCourseProgress("human-rights-law-enforcement", {
    currentModule: 2,
    completed: [1],
  });
  setCourseProgress("community-first-response", {
    currentModule: 5,
    completed: [1, 2, 3, 4, 5],
  });
  saveCertificates([
    {
      slug: "community-first-response",
      title: "Community-Based Substance Abuse First Response",
      issued: "12 Aug 2026",
      id: "KAD-CFR-2026-0142",
    },
  ]);
  setPlayerSeconds("dptc", 73);
  sessionStore()?.setItem(TIME_KEY, "3h 20");
  sessionStore()?.setItem(RETURNING_KEY, "1");
}

export function isReturningLearner() {
  return sessionStore()?.getItem(RETURNING_KEY) === "1";
}

export function ensureReturningProgress() {
  if (!isReturningLearner()) return;
  const progress = getCourseProgress("dptc");
  if (progress.completed.length >= 8 && getCertificates().length > 0) return;
  markReturningLearner();
}

export type CourseProgress = {
  currentModule: number;
  completed: number[];
};

export function getCourseProgress(slug: string): CourseProgress {
  const all = readJson<Record<string, CourseProgress>>(PROGRESS_KEY, sessionStore()) ?? {};
  return all[slug] ?? { currentModule: 1, completed: [] };
}

export function setCourseProgress(slug: string, progress: CourseProgress) {
  const store = sessionStore();
  if (!store) return;
  const all = readJson<Record<string, CourseProgress>>(PROGRESS_KEY, store) ?? {};
  all[slug] = progress;
  store.setItem(PROGRESS_KEY, JSON.stringify(all));
}

export function markModuleComplete(courseSlug: string, moduleIndex: number) {
  const current = getCourseProgress(courseSlug);
  const completed = Array.from(new Set([...current.completed, moduleIndex]));
  setCourseProgress(courseSlug, {
    currentModule: Math.max(current.currentModule, moduleIndex + 1),
    completed,
  });
}

export function continueHref(slug: string, progress?: CourseProgress) {
  const mapped: DbCourseProgress = progress
    ? {
        currentModule: progress.currentModule,
        completed: progress.completed,
        playerSeconds: 0,
      }
    : {
        currentModule: getCourseProgress(slug).currentModule,
        completed: getCourseProgress(slug).completed,
        playerSeconds: getPlayerSeconds(slug),
      };
  if (mapped.currentModule < 1) {
    return continueHrefFromProgress(slug, emptyProgress());
  }
  return continueHrefFromProgress(slug, mapped);
}

export function dptcProgressPercent(progress?: CourseProgress) {
  const current = progress ?? getCourseProgress("dptc");
  return progressPercent(
    {
      currentModule: current.currentModule,
      completed: current.completed,
      playerSeconds: 0,
    },
    dptcModules.length
  );
}

export function learningTimeLabel() {
  return sessionStore()?.getItem(TIME_KEY) || "0";
}

export type IssuedCertificate = {
  slug: string;
  title: string;
  issued: string;
  id: string;
};

export function getCertificates(): IssuedCertificate[] {
  return readJson<IssuedCertificate[]>(CERTS_KEY, sessionStore()) ?? [];
}

export function saveCertificates(certs: IssuedCertificate[]) {
  sessionStore()?.setItem(CERTS_KEY, JSON.stringify(certs));
}

export function getPlayerSeconds(slug: string, fallback = 0) {
  const all = readJson<Record<string, number>>(PLAYER_KEY, sessionStore()) ?? {};
  return all[slug] ?? fallback;
}

export function setPlayerSeconds(slug: string, seconds: number) {
  const store = sessionStore();
  if (!store) return;
  const all = readJson<Record<string, number>>(PLAYER_KEY, store) ?? {};
  all[slug] = seconds;
  store.setItem(PLAYER_KEY, JSON.stringify(all));
}

export type QuizAttemptState = {
  answers: Array<number | null>;
  index: number;
  remaining: number;
  attemptsUsed: number;
  submitted: boolean;
  score: number | null;
  correctIndexes?: number[];
  verificationId?: string;
};

export function quizStorageKey(courseSlug: string, quizSlug: string) {
  return `${QUIZ_KEY_PREFIX}${courseSlug}.${quizSlug}`;
}

export function defaultQuizState(questionCount: number, seconds: number): QuizAttemptState {
  return {
    answers: Array.from({ length: questionCount }, () => null),
    index: 0,
    remaining: seconds,
    attemptsUsed: 0,
    submitted: false,
    score: null,
  };
}

export function getQuizState(courseSlug = "dptc", quizSlug = "module-1"): QuizAttemptState | null {
  return (
    readJson<QuizAttemptState>(quizStorageKey(courseSlug, quizSlug), sessionStore()) ??
    (courseSlug === "dptc"
      ? readJson<QuizAttemptState>(`${QUIZ_KEY_PREFIX}${quizSlug}`, sessionStore()) ??
        (quizSlug === "module-1" ? readJson<QuizAttemptState>(QUIZ_KEY, sessionStore()) : null)
      : null)
  );
}

export function saveQuizState(
  state: QuizAttemptState,
  courseSlug = "dptc",
  quizSlug = "module-1"
) {
  sessionStore()?.setItem(quizStorageKey(courseSlug, quizSlug), JSON.stringify(state));
}

export function clearQuizState(courseSlug = "dptc", quizSlug = "module-1") {
  const store = sessionStore();
  store?.removeItem(quizStorageKey(courseSlug, quizSlug));
  if (courseSlug === "dptc" && quizSlug === "module-1") store?.removeItem(QUIZ_KEY);
}
