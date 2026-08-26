export const LEARNER_KEY = "kadsamhsa.learner";
export const ENROLLED_KEY = "kadsamhsa.enrolled";
export const ONBOARDING_KEY = "kadsamhsa.onboarding.v1";

export type Learner = {
  name: string;
  email: string;
};

function readJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function saveLearner(learner: Learner) {
  sessionStorage.setItem(LEARNER_KEY, JSON.stringify(learner));
}

export function getLearner(): Learner | null {
  const value = readJson<Learner>(LEARNER_KEY);
  if (!value?.email) return null;
  return {
    name: value.name?.trim() || value.email.split("@")[0] || "Learner",
    email: value.email,
  };
}

export function clearLearner() {
  sessionStorage.removeItem(LEARNER_KEY);
  sessionStorage.removeItem(ENROLLED_KEY);
  sessionStorage.removeItem(ONBOARDING_KEY);
}

export function firstNameOf(name: string) {
  return name.trim().split(/\s+/)[0] || "Learner";
}

export function getEnrolled(): string[] {
  return readJson<string[]>(ENROLLED_KEY) ?? [];
}

export function enrollCourse(slug: string) {
  const next = Array.from(new Set([...getEnrolled(), slug]));
  sessionStorage.setItem(ENROLLED_KEY, JSON.stringify(next));
}

export function isOnboardingDone() {
  return sessionStorage.getItem(ONBOARDING_KEY) === "done";
}

export function completeOnboarding() {
  sessionStorage.setItem(ONBOARDING_KEY, "done");
}
