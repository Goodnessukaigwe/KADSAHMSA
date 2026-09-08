import { AdminOrganizations } from "@/components/admin/admin-organizations";
import { listOrganisations } from "@/lib/org/queries";

export const metadata = { title: "Organisations" };

export default async function AdminOrganizationsPage() {
  const orgs = await listOrganisations();
  return <AdminOrganizations orgs={orgs} />;
}
