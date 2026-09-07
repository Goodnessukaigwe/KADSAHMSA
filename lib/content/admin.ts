import { catalogueCourses } from "@/lib/content/catalogue";

export const adminDashboardStats = [
  { value: "1,062", label: "Registered learners" },
  { value: "2", label: "Published courses" },
  { value: "41%", label: "Completion rate" },
  { value: "812", label: "Certificates issued" },
] as const;

export const recentEnrolments = [
  { name: "Aisha Bello", course: "DPTC Sensitization", when: "2 hours ago" },
  { name: "Musa Ibrahim", course: "DPTC Sensitization", when: "2 hours ago" },
  { name: "Chinedu Okeke", course: "Community First Response", when: "5 hours ago" },
  { name: "Fatima Sule", course: "DPTC Sensitization", when: "Yesterday" },
  { name: "Tunde Adeyemi", course: "Human Rights Frameworks", when: "Yesterday" },
  { name: "Ngozi Eze", course: "DPTC Sensitization", when: "2 days ago" },
  { name: "Habiba Lawal", course: "DPTC Sensitization", when: "2 days ago" },
] as const;

export type AdminCourseStatus = "published" | "draft";

export type AdminCourse = {
  slug: string;
  title: string;
  image: string;
  status: AdminCourseStatus;
  enrolled: number;
  price: string;
};

const PUBLISHED_ENROLLED: Record<string, number> = {
  dptc: 2140,
  "community-first-response": 623,
  "human-rights-law-enforcement": 410,
  "biological-drivers": 288,
  "family-interventions": 256,
  "advocacy-programmes": 198,
  "special-populations": 174,
  "drug-screening": 161,
  "drug-use-nigeria": 149,
  "demand-harm-reduction": 132,
  "types-of-treatment": 118,
};

const DRAFT_SLUGS = new Set(["trainer-resource-pack", "organisation-cohort"]);

export function adminCourses(): AdminCourse[] {
  return catalogueCourses
    .filter((course) => course.slug !== "law-enforcement-issues")
    .map((course) => {
      const draft = DRAFT_SLUGS.has(course.slug);
      return {
        slug: course.slug,
        title: course.title,
        image: course.image,
        status: draft ? "draft" : "published",
        enrolled: draft ? 0 : (PUBLISHED_ENROLLED[course.slug] ?? 80),
        price: course.priceType === "paid" ? "₦5,000" : "Free",
      };
    });
}

export const adminUserRows = [
  { name: "Aisha Bello", org: "KADSAMHSA HQ", role: "Learner", status: "Active" },
  { name: "Musa Ibrahim", org: "Kaduna Command", role: "Learner", status: "Active" },
  { name: "Chinedu Okeke", org: "State Ministry of Health", role: "Learner", status: "Active" },
  { name: "Fatima Sule", org: "Community partner", role: "Learner", status: "Pending" },
  { name: "Tunde Adeyemi", org: "NDLEA liaison", role: "Learner", status: "Active" },
] as const;
