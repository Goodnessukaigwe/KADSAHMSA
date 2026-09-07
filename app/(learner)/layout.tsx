import { StudentChrome } from "@/components/learner/student-chrome";
import { requireSessionProfile } from "@/lib/permissions";

export default async function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireSessionProfile();
  return (
    <StudentChrome user={{ name: profile.name, email: profile.email }}>
      {children}
    </StudentChrome>
  );
}
