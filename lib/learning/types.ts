import type { CourseProgress } from "@/lib/learning/progress";

export type EnrolmentRecord = {
  slug: string;
  title: string;
  image: string;
  lessons: number;
  progress: CourseProgress;
  percent: number;
  moduleLabel: string;
  href: string;
  complete: boolean;
};

export type LearningSnapshot = {
  enrolments: EnrolmentRecord[];
  inProgress: EnrolmentRecord[];
  completed: EnrolmentRecord[];
  enrolledSlugs: string[];
};
