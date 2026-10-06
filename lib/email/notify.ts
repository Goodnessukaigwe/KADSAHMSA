import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { certificateEmail, enrolmentEmail } from "@/lib/email/templates";
import { emailConfigured, sendEmail, siteUrl } from "@/lib/email/send";
import type { Database } from "@/lib/supabase/database";

type AdminClient = SupabaseClient<Database>;

async function learnerContact(admin: AdminClient, userId: string) {
  const { data } = await admin.auth.admin.getUserById(userId);
  const user = data?.user;
  if (!user?.email) return null;
  const meta = (user.user_metadata ?? {}) as { full_name?: string };
  return { email: user.email, name: meta.full_name?.trim() || "" };
}

/** Best effort: a failed email never blocks enrolling. */
export async function notifyEnrolled(
  admin: AdminClient,
  input: { userId: string; courseTitle: string; courseSlug: string }
) {
  if (!emailConfigured()) return;
  try {
    const contact = await learnerContact(admin, input.userId);
    if (!contact) return;
    const mail = enrolmentEmail({
      name: contact.name,
      courseTitle: input.courseTitle,
      url: `${siteUrl()}/learn/${encodeURIComponent(input.courseSlug)}`,
    });
    await sendEmail({ to: contact.email, ...mail });
  } catch (cause) {
    console.error("notifyEnrolled", cause);
  }
}

/** Best effort: the certificate is already issued; the email is a courtesy copy. */
export async function notifyCertificate(
  admin: AdminClient,
  input: {
    userId: string;
    courseTitle: string;
    verificationId: string;
    pdf: Uint8Array;
  }
) {
  if (!emailConfigured()) return;
  try {
    const contact = await learnerContact(admin, input.userId);
    if (!contact) return;
    const mail = certificateEmail({
      name: contact.name,
      courseTitle: input.courseTitle,
      verificationId: input.verificationId,
      url: `${siteUrl()}/certificates`,
    });
    await sendEmail({
      to: contact.email,
      ...mail,
      attachments: [
        {
          filename: `KADSAMHSA-certificate-${input.verificationId}.pdf`,
          content: Buffer.from(input.pdf).toString("base64"),
        },
      ],
    });
  } catch (cause) {
    console.error("notifyCertificate", cause);
  }
}
