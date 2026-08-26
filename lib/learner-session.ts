export const LEARNER_KEY = "kadsamhsa.learner";
export const ENROLLED_KEY = "kadsamhsa.enrolled";
export const ONBOARDING_KEY = "kadsamhsa.onboarding.v1";
export const NAMES_KEY = "kadsamhsa.learner.names";
export const RETURNING_KEY = "kadsamhsa.returning";

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
  sessionStore()?.setItem(RETURNING_KEY, "1");
}

export function isReturningLearner() {
  return sessionStore()?.getItem(RETURNING_KEY) === "1";
}
