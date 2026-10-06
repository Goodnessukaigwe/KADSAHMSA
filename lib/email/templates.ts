import { siteUrl } from "@/lib/email/send";

/**
 * Branded transactional emails. Every template returns subject, html and a
 * plain-text twin. Markup is table-based with inline styles because that is
 * what email clients render reliably.
 */

const AGENCY = "Kaduna State Substance Abuse and Mental Health Service Agency (KADSAMHSA)";
const GREEN = "#0b4d2c";
const GOLD = "#c9a227";

export type RenderedEmail = { subject: string; html: string; text: string };

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(name: string | null | undefined) {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first || "there";
}

function layout(input: {
  preview: string;
  heading: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  note?: string;
}) {
  const site = siteUrl();
  const paragraphs = input.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1a2e23;">${esc(p)}</p>`)
    .join("");
  const button = input.button
    ? `<p style="margin:24px 0;"><a href="${esc(input.button.url)}" style="display:inline-block;background:${GREEN};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 28px;border-radius:999px;">${esc(input.button.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#5b6b61;">If the button does not work, copy this link into your browser:<br><a href="${esc(input.button.url)}" style="color:${GREEN};word-break:break-all;">${esc(input.button.url)}</a></p>`
    : "";
  const note = input.note
    ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#5b6b61;">${esc(input.note)}</p>`
    : "";

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(input.heading)}</title></head>
<body style="margin:0;padding:0;background:#f4f7f5;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(input.preview)}</span>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f5;padding:24px 12px;"><tr><td align="center">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #dfe9e2;">
    <tr><td style="background:${GREEN};padding:20px 28px;border-bottom:4px solid ${GOLD};">
      <table role="presentation" cellspacing="0" cellpadding="0"><tr>
        <td style="background:#ffffff;border-radius:10px;padding:6px 10px;"><img src="${esc(site)}/brand/logo.png" width="64" alt="KADSAMHSA" style="display:block;border:0;"></td>
        <td style="padding-left:14px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;letter-spacing:.04em;">KADSAMHSA Academy</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:32px 28px 28px;font-family:Arial,Helvetica,sans-serif;">
      <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:${GREEN};">${esc(input.heading)}</h1>
      ${paragraphs}${button}${note}
    </td></tr>
    <tr><td style="background:#e8f3ec;padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#4a5d52;">
      ${esc(AGENCY)}<br><a href="${esc(site)}" style="color:${GREEN};">${esc(site.replace(/^https?:\/\//, ""))}</a>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function plain(input: { heading: string; paragraphs: string[]; button?: { label: string; url: string }; note?: string }) {
  return [
    input.heading,
    "",
    ...input.paragraphs.flatMap((p) => [p, ""]),
    ...(input.button ? [`${input.button.label}: ${input.button.url}`, ""] : []),
    ...(input.note ? [input.note, ""] : []),
    "—",
    `KADSAMHSA Academy · ${AGENCY}`,
    siteUrl(),
  ].join("\n");
}

function build(subject: string, parts: Parameters<typeof layout>[0]): RenderedEmail {
  return { subject, html: layout(parts), text: plain(parts) };
}

export function verificationEmail(input: { name: string; url: string }): RenderedEmail {
  return build("Confirm your email for KADSAMHSA Academy", {
    preview: "Confirm your email address to finish creating your account.",
    heading: "Confirm your email",
    paragraphs: [
      `Hello ${firstName(input.name)},`,
      "Thank you for signing up to KADSAMHSA Academy. Please confirm your email address to finish creating your account and start learning.",
    ],
    button: { label: "Confirm my email", url: input.url },
    note: "If you did not sign up, you can ignore this email and no account will be activated.",
  });
}

export function passwordResetEmail(input: { name: string; url: string }): RenderedEmail {
  return build("Reset your KADSAMHSA Academy password", {
    preview: "Use this link to choose a new password.",
    heading: "Reset your password",
    paragraphs: [
      `Hello ${firstName(input.name)},`,
      "We received a request to reset the password for your KADSAMHSA Academy account. Choose a new password with the button below.",
    ],
    button: { label: "Choose a new password", url: input.url },
    note: "If you did not ask for this, ignore this email. Your password stays the same.",
  });
}

export function enrolmentEmail(input: { name: string; courseTitle: string; url: string }): RenderedEmail {
  return build(`You are enrolled: ${input.courseTitle}`, {
    preview: `You can start ${input.courseTitle} now.`,
    heading: "You are enrolled",
    paragraphs: [
      `Hello ${firstName(input.name)},`,
      `You are now enrolled in ${input.courseTitle}. Work through the lessons at your own pace, and pass the quizzes to earn your certificate.`,
    ],
    button: { label: "Start learning", url: input.url },
  });
}

export function certificateEmail(input: {
  name: string;
  courseTitle: string;
  verificationId: string;
  url: string;
}): RenderedEmail {
  return build(`Your certificate: ${input.courseTitle}`, {
    preview: `Congratulations, you completed ${input.courseTitle}.`,
    heading: "Congratulations",
    paragraphs: [
      `Hello ${firstName(input.name)},`,
      `You have completed ${input.courseTitle}. Your certificate is attached to this email as a PDF, and you can always download it again from your account.`,
      `Verification ID: ${input.verificationId}. Anyone can confirm your certificate with this ID on our public verify page.`,
    ],
    button: { label: "View my certificates", url: input.url },
  });
}

export function chatTeamAlertEmail(input: {
  visitorName: string;
  visitorEmail: string | null;
  reason: string;
  text: string;
  url: string;
}): RenderedEmail {
  const who = input.visitorName || "A website visitor";
  return build(`New message from ${who} (live chat)`, {
    preview: `${who} ${input.reason}.`,
    heading: "New chat message",
    paragraphs: [
      `${who}${input.visitorEmail ? ` (${input.visitorEmail})` : ""} ${input.reason}:`,
      input.text.slice(0, 1500),
    ],
    button: { label: "Open the conversation", url: input.url },
    note: "Reply in the inbox so the visitor sees it in their chat. We send at most one alert per conversation every 10 minutes.",
  });
}

export function chatReplyEmail(input: {
  name: string;
  helper: string;
  text: string;
  url: string;
}): RenderedEmail {
  return build(`${input.helper} from KADSAMHSA replied`, {
    preview: `${input.helper} replied to your message.`,
    heading: "You have a reply",
    paragraphs: [
      `Hello ${firstName(input.name)},`,
      `${input.helper} from the KADSAMHSA team replied:`,
      input.text.slice(0, 1500),
    ],
    button: { label: "Continue the conversation", url: input.url },
    note: "Please reply in the chat so the whole team can see it.",
  });
}
