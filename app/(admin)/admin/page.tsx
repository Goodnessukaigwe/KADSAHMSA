import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getOverview } from "@/lib/admin/analytics";
import { getAdminDashboard } from "@/lib/courses/queries";

export const metadata = { title: "Admin" };

export default async function AdminHomePage() {
  const [overview, { recent }] = await Promise.all([getOverview(), getAdminDashboard()]);
  return <AdminDashboard overview={overview} recent={recent} />;
}
