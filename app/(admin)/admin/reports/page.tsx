import { AdminReports } from "@/components/admin/admin-reports";
import { listReportRows } from "@/lib/org/queries";

export const metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  const rows = await listReportRows();
  return <AdminReports rows={rows} />;
}
