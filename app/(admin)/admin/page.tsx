import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { getAdminDashboard } from "@/lib/courses/queries";

export const metadata = { title: "Admin" };

export default async function AdminHomePage() {
  const { stats, recent } = await getAdminDashboard();
  return <AdminDashboard stats={stats} recent={recent} />;
}
