import { adminCourses } from "@/lib/content/admin";
import { dptcModules, getLesson } from "@/lib/content/dptc";

export type LessonStatus = "draft" | "live";

export type BuilderLesson = {
  id: string;
  title: string;
  slug: string;
  status: LessonStatus;
  duration: string;
  introduction: string;
  main: string;
  notes: string;
};

export type BuilderQuestion = {
  id: string;
  prompt: string;
};

export const defaultFields = [
  "Title",
  "Status",
  "Slug",
  "Duration",
  "Introduction",
  "Main Content",
  "Additional Notes",
  "Cover Photo",
  "Photo 1",
  "Photo 2",
  "Photo 3",
  "Photo 4",
] as const;

export function builderCourseList() {
  return adminCourses()
    .filter((course) => course.status === "published")
    .slice(0, 5)
    .map((course, index) => ({
      slug: course.slug,
      label: shortCourseName(course.title, index),
    }));
}

export function courseLabel(slug: string, index = 0) {
  if (slug === "new" || slug.startsWith("course-")) {
    const n = slug === "new" ? 6 : Number(slug.replace("course-", "")) || index + 1;
    return `Course ${n}`;
  }
  const course = adminCourses().find((item) => item.slug === slug);
  if (course) return shortCourseName(course.title, index);
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shortCourseName(title: string, index: number) {
  if (title.includes("DPTC") && !title.includes("Trainer")) return "DPTC Sensitization";
  if (title.includes("Community")) return "Community First Response";
  if (title.includes("Human Rights")) return "Human Rights Frameworks";
  if (title.includes("Biological")) return "Biological Drivers";
  if (title.includes("Family")) return "Family Interventions";
  return `Course ${index + 1}`;
}

export function lessonsForCourse(slug: string): BuilderLesson[] {
  if (slug === "new" || slug.startsWith("course-")) {
    return [];
  }
  if (slug === "dptc") {
    return dptcModules.map((module, index) => {
      const lesson = getLesson(module.slug);
      return {
        id: module.slug,
        title: module.title,
        slug: module.slug,
        status: index === 0 ? "draft" : "live",
        duration: `${module.minutes} Min`,
        introduction: lesson.sections[0]?.body ?? "",
        main: lesson.sections.slice(1).map((section) => section.body).join("\n\n"),
        notes: lesson.keyTerm.body,
      };
    });
  }

  const course = adminCourses().find((item) => item.slug === slug);
  const base = course?.title ?? "Untitled course";
  return [0, 1, 2, 3].map((index) => ({
    id: `${slug}-${index + 1}`,
    title: `${base} — Part ${index + 1}`,
    slug: `${slug}-part-${index + 1}`,
    status: index === 0 ? "draft" : "live",
    duration: `${15 + index * 10} Min`,
    introduction: `Opening notes for ${base}, part ${index + 1}.`,
    main: `Lesson body for ${base}. Keep copy aligned with the DPTC trainer resource.`,
    notes: "Save progress before publishing.",
  }));
}

export function slugFromTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
