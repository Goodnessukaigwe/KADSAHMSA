import { VerifyCertificate } from "@/components/public/verify-certificate";

export const metadata = { title: "Verify certificate" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return <VerifyCertificate initialId={id?.trim() ?? ""} />;
}
