import { JoinInvite } from "@/components/org/join-invite";

export const metadata = { title: "Join organisation" };

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  return <JoinInvite code={code?.trim() ?? ""} />;
}
