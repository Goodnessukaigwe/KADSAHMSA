import { catalogueCourses } from "@/lib/content/catalogue";

const EXPLORE_SLUGS = [
  "community-first-response",
  "human-rights-law-enforcement",
  "biological-drivers",
] as const;

const EXPLORE_IMAGES: Record<(typeof EXPLORE_SLUGS)[number], string> = {
  "community-first-response": "/landing/dash-kimono.webp",
  "human-rights-law-enforcement": "/landing/hero-phoenix.webp",
  "biological-drivers": "/landing/hero-cabin.webp",
};

export const dashboardCopy = {
  greetingEyebrow: "New here?",
  greeting: "Start with the DPTC Sensitization Course",
  exploreTitle: "Explore More Courses",
  featured: {
    slug: "dptc",
    title: "Sensitization On (DPTC)",
    price: "Free",
    description:
      "A UNODC/EU-supported course for law enforcement and the public. Learn to recognize dependence, understand treatment, and respond with dignity.",
    image: "/landing/dash-balloons.webp",
    imageAlt: "Hot air balloons over a valley at sunrise",
  },
  enroll: "Enroll for this course",
  continue: "Continue this course",
  readMore: "Read more",
  searchPlaceholder: "search course...",
  onboarding: [
    {
      title: "Select A Course",
      body: "Choose a course you want to start with or start with the recommended course",
    },
    {
      title: "Enroll To Begin",
      body: "Enroll in the recommended DPTC course, or pick another free course below. Your place is saved to this account.",
    },
    {
      title: "You Are Set",
      body: "Homepage keeps your courses in one place. Quizzes and Help Center live in the sidebar when you need them.",
    },
  ],
} as const;

export function dashboardExploreCourses() {
  return EXPLORE_SLUGS.map((slug) => {
    const course = catalogueCourses.find((item) => item.slug === slug);
    if (!course) {
      throw new Error(`Missing catalogue course: ${slug}`);
    }
    return { ...course, image: EXPLORE_IMAGES[slug] };
  });
}
