import { OrgDashboard } from "@/components/org/org-dashboard";
import { getOrgDashboard, listReportRows } from "@/lib/org/queries";

export const metadata = { title: "Organisation" };

export default async function OrgDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org: orgId } = await searchParams;
  const dashboard = await getOrgDashboard(orgId);
  const reports = dashboard.org ? await listReportRows(dashboard.org.id) : [];
  return (
    <OrgDashboard
      org={dashboard.org}
      members={dashboard.members}
      invites={dashboard.invites}
      courses={dashboard.courses}
      staffOrgs={dashboard.staffOrgs}
      reports={reports}
    />
  );
}
