import "server-only";

/**
 * Transactional email through Resend's REST API.
 *
 * Needs RESEND_API_KEY and MAIL_FROM (for example
 * "KADSAMHSA Academy <academy@yourdomain>", on a domain verified in Resend).
 * Without them every call is skipped, so the app works exactly as before.
 * Sending never throws: callers decide what a failed email means.
 */

export type EmailAttachment = { filename: string; content: string }; // content is base64

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string; skipped?: boolean };

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim() && process.env.MAIL_FROM?.trim());
}

/** Public site address for links inside emails (no trailing slash). */
export function siteUrl() {
  const explicit = process.env.SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (!emailConfigured()) {
    return { ok: false, skipped: true, error: "Email is not configured." };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.MAIL_FROM!.trim(),
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("resend: send failed", response.status, detail.slice(0, 300));
      return { ok: false, error: `The email provider returned ${response.status}.` };
    }

    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: data?.id ?? null };
  } catch (cause) {
    console.error("resend: could not reach the provider", cause);
    return { ok: false, error: "Could not reach the email provider." };
  }
}
