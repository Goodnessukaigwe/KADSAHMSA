import { UserDetail } from "@/components/admin/user-detail";

export const metadata = { title: "User profile" };

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UserDetail id={id} />;
}
