import { AdminChrome } from "@/components/admin/admin-chrome";
import { requireSessionProfile, requireStaff } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaff();
  const profile = await requireSessionProfile();
  return (
    <AdminChrome user={{ name: profile.name, email: profile.email }}>
      {children}
    </AdminChrome>
  );
}
