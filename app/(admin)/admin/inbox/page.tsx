import { AdminInbox } from "@/components/admin/admin-inbox";

export const metadata = { title: "Chat inbox" };

export default async function AdminInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ chat?: string }>;
}) {
  const { chat } = await searchParams;
  return <AdminInbox initialChat={chat ?? null} />;
}
