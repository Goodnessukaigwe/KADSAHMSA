/**
 * Colours for a course's lesson pages, taken from its slide decks so a lesson reads like the
 * slide it came from: DPTC is deep teal with gold, mhGAP is forest green with orange.
 */
export type CourseTheme = {
  /** Titles, the module hero and numbered markers. */
  deep: string;
  /** Eyebrow labels, accents and the footer tag. */
  accent: string;
  /** Soft panel behind case studies and readings. */
  soft: string;
  /** Warm panel for knowledge checks and callouts. */
  cream: string;
};

const THEMES: Record<string, CourseTheme> = {
  "dptc-course": { deep: "#0b4a5c", accent: "#b8860b", soft: "#eaf2f1", cream: "#fbf3e1" },
  "mhgap-basic": { deep: "#0f5a4a", accent: "#c0561b", soft: "#e9f3ef", cream: "#fbf0e4" },
};

const DEFAULT_THEME: CourseTheme = {
  deep: "#0b4d2c",
  accent: "#b8860b",
  soft: "#eaf3ee",
  cream: "#fbf3e1",
};

export function courseTheme(courseSlug: string): CourseTheme {
  return THEMES[courseSlug] ?? DEFAULT_THEME;
}

/** The small caps label above a page title, taken from what the page is. */
export function pageEyebrow(title: string, moduleTitle: string): string {
  const t = title.toLowerCase();
  if (t.includes("pre-test")) return "Pre-test";
  if (t.includes("overview") && t.includes("objective")) return "Learning objectives";
  if (t.startsWith("key points")) return "Key points";
  if (/case study|using survey data|practice activit|try it yourself|self-check/.test(t)) return "Case study";
  return moduleTitle;
}
