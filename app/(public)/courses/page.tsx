import { CourseCatalogue } from "@/components/courses/course-catalogue";

export const metadata = {
  title: "Courses",
  description:
    "Browse KADSAMHSA courses on drug prevention, treatment, and care — including the free DPTC sensitisation curriculum.",
};

export default function CataloguePage() {
  return <CourseCatalogue />;
}
