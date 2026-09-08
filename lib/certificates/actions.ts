"use server";

import { revalidatePath } from "next/cache";

import { issueCertificateIfEligible } from "@/lib/certificates/issue";
import { requireOwnCertificate } from "@/lib/certificates/queries";
import { requireStaff, requireUser } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };

export type DownloadResult =
  | { ok: true; url: string; filename: string }
  | { ok: false; error: string };

export type VerifyResult =
  | {
      status: "valid" | "revoked";
      learnerName: string;
      courseTitle: string;
      issuedAt: string;
    }
  | { status: "not_found" };

export async function getCertificateDownloadUrl(
  certificateId: string
): Promise<DownloadResult> {
  const cert = await requireOwnCertificate(certificateId);
  if (!cert) return { ok: false, error: "That certificate is not on this account." };

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("certificates")
    .createSignedUrl(cert.storage_path, 60 * 10);

  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message || "Could not create a download link." };
  }

  return {
    ok: true,
    url: data.signedUrl,
    filename: `${cert.verification_id}.pdf`,
  };
}

export async function revokeCertificate(
  certificateId: string,
  reason: string
): Promise<ActionResult> {
  const { user } = await requireStaff();
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    return { ok: false, error: "Give a short reason for revoking this certificate." };
  }

  const admin = createAdminClient();
  const { data: cert } = await admin
    .from("certificates")
    .select("id, status, user_id")
    .eq("id", certificateId)
    .maybeSingle();
  if (!cert) return { ok: false, error: "Certificate not found." };
  if (cert.status === "revoked") {
    return { ok: false, error: "This certificate is already revoked." };
  }

  const { error: updateError } = await admin
    .from("certificates")
    .update({ status: "revoked" })
    .eq("id", certificateId);
  if (updateError) {
    return { ok: false, error: updateError.message || "Could not revoke this certificate." };
  }

  const { error: revokeError } = await admin.from("certificate_revocations").insert({
    certificate_id: certificateId,
    reason: trimmed,
    revoked_by: user.id,
  });
  if (revokeError) {
    return { ok: false, error: revokeError.message || "Could not record the revocation." };
  }

  revalidatePath("/certificates");
  revalidatePath("/verify");
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${cert.user_id}`);
  return { ok: true };
}

export async function verifyCertificate(id: string): Promise<VerifyResult> {
  const trimmed = id.trim();
  if (!trimmed) return { status: "not_found" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("verify_certificate", { p_id: trimmed });
  if (error || !data?.length) return { status: "not_found" };

  const row = data[0];
  if (row.status !== "valid" && row.status !== "revoked") {
    return { status: "not_found" };
  }

  return {
    status: row.status,
    learnerName: row.learner_name,
    courseTitle: row.course_title,
    issuedAt: row.issued_at,
  };
}

export async function issueOwnCertificate(courseSlug: string) {
  const user = await requireUser();
  return issueCertificateIfEligible(courseSlug, user.id, 0);
}

export async function issueOwnDptcCertificate() {
  return issueOwnCertificate("dptc");
}
