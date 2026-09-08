import { notFound } from "next/navigation";

import { UserDetail } from "@/components/admin/user-detail";
import {
  getCertificatesForUser,
  getStaffLearner,
  getStaffLearnerLearning,
} from "@/lib/certificates/queries";
import { listAssignableCourses } from "@/lib/courses/queries";
import { listLearnerOrganisations, listOrgOptions } from "@/lib/org/queries";
import { getUserRoles, hasRole, requireSessionProfile } from "@/lib/permissions";

export const metadata = { title: "User profile" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireSessionProfile();
  const [learner, certificates, learning, courses, organisations, memberships, learnerRoles] =
    await Promise.all([
      getStaffLearner(id),
      getCertificatesForUser(id),
      getStaffLearnerLearning(id),
      listAssignableCourses(),
      listOrgOptions(),
      listLearnerOrganisations(id),
      getUserRoles(id),
    ]);
  if (!learner) notFound();
  return (
    <UserDetail
      learner={learner}
      certificates={certificates}
      learning={learning}
      courses={courses}
      organisations={organisations}
      memberships={memberships}
      learnerRoles={learnerRoles}
      viewerIsSuperAdmin={hasRole(profile.roles, "super_admin")}
    />
  );
}
