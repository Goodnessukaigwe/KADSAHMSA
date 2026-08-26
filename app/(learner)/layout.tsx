import { StudentChrome } from "@/components/learner/student-chrome";

export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StudentChrome>{children}</StudentChrome>;
}
