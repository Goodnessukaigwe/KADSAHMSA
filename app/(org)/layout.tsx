import { OrgChrome } from "@/components/org/org-chrome";
import { isStaff, requireOrgAccess, requireSessionProfile } from "@/lib/permissions";

export default async function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { roles } = await requireOrgAccess();
  const profile = await requireSessionProfile();
  return (
    <OrgChrome
      user={{ name: profile.name, email: profile.email }}
      isStaff={isStaff(roles)}
    >
      {children}
    </OrgChrome>
  );
}
