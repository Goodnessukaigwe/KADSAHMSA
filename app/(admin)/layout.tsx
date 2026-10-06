import { AdminChrome } from "@/components/admin/admin-chrome";
import { countChatsNeedingReply } from "@/lib/help/actions";
import { countUnreadFeedback } from "@/lib/feedback/queries";
import { requireSessionProfile, requireStaff } from "@/lib/permissions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireStaff();
  const [profile, unreadFeedback, chatsWaiting] = await Promise.all([
    requireSessionProfile(),
    countUnreadFeedback(),
    countChatsNeedingReply(),
  ]);
  return (
    <AdminChrome
      unreadFeedback={unreadFeedback}
      chatsWaiting={chatsWaiting}
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
