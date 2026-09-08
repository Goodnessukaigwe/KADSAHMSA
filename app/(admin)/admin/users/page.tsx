import { AdminUsers } from "@/components/admin/admin-users";
import { listStaffLearners } from "@/lib/certificates/queries";

export const metadata = { title: "Users Metric" };

export default async function AdminUsersPage() {
  const learners = await listStaffLearners();
  return <AdminUsers learners={learners} />;
}
