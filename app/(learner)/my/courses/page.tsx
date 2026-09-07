import { MyCourses } from "@/components/learner/my-courses";
import { getLearningSnapshot } from "@/lib/learning/queries";

export const metadata = { title: "My courses" };

export default async function MyCoursesPage() {
  const snapshot = await getLearningSnapshot();
  return <MyCourses snapshot={snapshot} />;
}
