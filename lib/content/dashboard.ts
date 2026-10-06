export const dashboardCopy = {
  greetingEyebrow: "New here?",
  greeting: "Start with a published course",
  returningEyebrow: "Continue your learning journey",
  startedTitle: "You also started these courses",
  exploreTitle: "Explore more courses",
  enroll: "Enroll",
  enrolling: "Enrolling…",
  requested: "Enrolled",
  continue: "Continue this course",
  continueFeatured: "Continue with this course",
  continueShort: "Continue",
  readMore: "Read more",
  searchPlaceholder: "Search course...",
  onboarding: [
    {
      title: "Select A Course",
      body: "Choose a published course from the catalogue when staff have added one.",
    },
    {
      title: "Enroll",
      body: "Press Enroll on a free course and you can start straight away.",
    },
    {
      title: "You Are Set",
      body: "Homepage keeps your courses in one place. Quizzes and Help Center live in the sidebar when you need them.",
    },
  ],
} as const;

export function returningGreeting(name: string) {
  return `Welcome back, ${name}`;
}
