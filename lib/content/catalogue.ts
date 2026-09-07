export type CataloguePrice = "free" | "paid";

export type CatalogueCourse = {
  slug: string;
  title: string;
  lessons: number;
  priceType: CataloguePrice;
  image: string;
};

export const catalogueHero = {
  title: "Insights that move your learning forward",
  subtitle:
    "Explore expert-led courses on drug prevention, treatment, care, and professional skill development.",
} as const;

export function getCatalogueCourse(slug: string) {
  return catalogueCourses.find((course) => course.slug === slug) ?? null;
}

export const catalogueCourses: CatalogueCourse[] = [
  {
    slug: "dptc",
    title: "Sensitization on Drug Use, Dependence & Prevention (DPTC)",
    lessons: 14,
    priceType: "free",
    image: "/landing/hero-phoenix.webp",
  },
  {
    slug: "community-first-response",
    title: "Community-Based Substance Abuse First Response",
    lessons: 5,
    priceType: "free",
    image: "/landing/hero-cabin.webp",
  },
  {
    slug: "human-rights-law-enforcement",
    title: "Human Rights Frameworks in Law Enforcement & Care",
    lessons: 4,
    priceType: "free",
    image: "/landing/hero-crystal.webp",
  },
  {
    slug: "biological-drivers",
    title: "Biological Drivers of Substance Dependence",
    lessons: 3,
    priceType: "free",
    image: "/landing/about-apple.webp",
  },
  {
    slug: "family-interventions",
    title: "Family Interventions in Drug Treatment",
    lessons: 4,
    priceType: "free",
    image: "/landing/about-stall.webp",
  },
  {
    slug: "advocacy-programmes",
    title: "Advocacy for Drug Prevention Programmes",
    lessons: 3,
    priceType: "free",
    image: "/landing/team-training.webp",
  },
  {
    slug: "special-populations",
    title: "Special Populations in Drug Care",
    lessons: 5,
    priceType: "free",
    image: "/landing/course-island.webp",
  },
  {
    slug: "drug-screening",
    title: "Drug Screening: Steps to Take",
    lessons: 4,
    priceType: "free",
    image: "/landing/course-lantern-path.webp",
  },
  {
    slug: "drug-use-nigeria",
    title: "The Drug Use Situation in Nigeria",
    lessons: 3,
    priceType: "free",
    image: "/landing/course-savannah.webp",
  },
  {
    slug: "demand-harm-reduction",
    title: "Demand and Harm Reduction",
    lessons: 4,
    priceType: "free",
    image: "/landing/course-cave.webp",
  },
  {
    slug: "types-of-treatment",
    title: "Types of Drug Treatment",
    lessons: 4,
    priceType: "free",
    image: "/landing/course-book.webp",
  },
  {
    slug: "law-enforcement-issues",
    title: "Specific Issues for Law Enforcement",
    lessons: 4,
    priceType: "free",
    image: "/landing/course-city.webp",
  },
  {
    slug: "trainer-resource-pack",
    title: "DPTC Trainer Resource Pack",
    lessons: 8,
    priceType: "paid",
    image: "/landing/course-book.webp",
  },
  {
    slug: "organisation-cohort",
    title: "Organisation Cohort: Facilitator Certification",
    lessons: 10,
    priceType: "paid",
    image: "/landing/team-training.webp",
  },
];
