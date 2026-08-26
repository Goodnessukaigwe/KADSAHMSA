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

export type StartedCourse = {
  slug: string;
  title: string;
  moduleLabel: string;
  percent: number;
  thumbnail: string;
};

export const dashboardCopy = {
  greetingEyebrow: "New here?",
  greeting: "Start with the DPTC Sensitization Course",
  returningEyebrow: "Continue your learning journey",
  startedTitle: "You also started these courses",
  exploreTitle: "Explore more courses",
  featured: {
    slug: "dptc",
    title: "Sensitization On (DPTC)",
    returningTitle:
      "Sensitization On Drug Use, Dependence & Prevention (DPTC)",
    price: "Free",
    module: "3 of 14",
    duration: "40 Min",
    percent: 58,
    description:
      "A UNODC/EU-supported course for law enforcement and the public. Learn to recognize dependence, understand treatment, and respond with dignity.",
    image: "/landing/dash-balloons.webp",
    imageAlt: "Hot air balloons over a valley at sunrise",
  },
  enroll: "Enroll for this course",
  continue: "Continue this course",
  continueFeatured: "Continue with this course",
  continueShort: "Continue",
  readMore: "Read more",
  searchPlaceholder: "Search course...",
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

export const returningStartedCourses: StartedCourse[] = [
  {
    slug: "dptc",
    title: "DPTC Sensitization Course",
    moduleLabel:
      "Module 8 of 14: Interventions and Responses to Drug Problems in the Family",
    percent: 55,
    thumbnail: "/landing/hero-phoenix.webp",
  },
  {
    slug: "human-rights-law-enforcement",
    title: "Human Rights Frameworks in Law Enforcement & Care",
    moduleLabel: "Module 2 of 4: Human Rights and Drug Users",
    percent: 40,
    thumbnail: "/landing/hero-crystal.webp",
  },
  {
    slug: "community-first-response",
    title: "Community-Based Substance Abuse First Response",
    moduleLabel: "Module 3 of 5: Community screening and first response",
    percent: 28,
    thumbnail: "/landing/dash-kimono.webp",
  },
];

export function dashboardExploreCourses() {
  return EXPLORE_SLUGS.map((slug) => {
    const course = catalogueCourses.find((item) => item.slug === slug);
    if (!course) {
      throw new Error(`Missing catalogue course: ${slug}`);
    }
    return { ...course, image: EXPLORE_IMAGES[slug] };
  });
}

export function returningGreeting(name: string) {
  return `Welcome back, ${name}`;
}
