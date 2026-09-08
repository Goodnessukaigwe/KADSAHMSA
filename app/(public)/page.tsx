import { LandingPage } from "@/components/landing/landing-page";
import { listPublishedCourses } from "@/lib/courses/queries";

export const metadata = {
  title: "Home",
  description:
    "Evidence-based drug prevention, treatment, and care training from KADSAMHSA — the Kaduna State Bureau for Substance Abuse Prevention and Treatment.",
};

export default async function HomePage() {
  const publishedCourses = await listPublishedCourses();
  return <LandingPage publishedCourses={publishedCourses} />;
}
