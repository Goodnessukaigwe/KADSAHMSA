import { notFound } from "next/navigation";

import { OrgDetail } from "@/components/admin/org-detail";
import { getOrgDetail } from "@/lib/org/queries";

export const metadata = { title: "Organisation" };

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getOrgDetail(id);
  if (!detail) notFound();
  return <OrgDetail detail={detail} />;
}
