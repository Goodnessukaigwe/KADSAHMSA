export const dashboardCopy = {
  greetingEyebrow: "New here?",
  greeting: "Start with a published course",
  returningEyebrow: "Continue your learning journey",
  startedTitle: "You also started these courses",
  exploreTitle: "Explore more courses",
  enroll: "Request enrolment",
  requested: "Requested",
  requestHint: "An administrator will enrol you. You can start when they do.",
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
      title: "Request Enrolment",
      body: "Ask for a seat on a published course. An administrator enrols you before lessons open.",
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
