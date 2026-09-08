import { issueOwnDptcCertificate } from "@/lib/certificates/actions";

export async function POST() {
  const result = await issueOwnDptcCertificate();
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json({
    verificationId: result.verificationId,
    existing: result.existing,
  });
}
