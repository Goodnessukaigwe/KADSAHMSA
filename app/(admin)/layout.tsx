import { AdminChrome } from "@/components/admin/admin-chrome";
import { countUnreadFeedback } from "@/lib/feedback/queries";
import { requireSessionProfile, requireStaff } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaff();
  const [profile, unreadFeedback] = await Promise.all([
    requireSessionProfile(),
    countUnreadFeedback(),
  ]);
  return (
    <AdminChrome
      unreadFeedback={unreadFeedback}
      user={{
        name: profile.name,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      }}
    >
      {children}
    </AdminChrome>
  );
}
