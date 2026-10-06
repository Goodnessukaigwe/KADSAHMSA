import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ChatRow } from "@/lib/help/engine";
import { chatReplyEmail, chatTeamAlertEmail } from "@/lib/email/templates";
import { emailConfigured, sendEmail, siteUrl } from "@/lib/email/send";
import type { Database } from "@/lib/supabase/database";

type Admin = SupabaseClient<Database>;

const QUIET_MS = 10 * 60 * 1000; // at most one email per conversation every 10 minutes
const ON_PAGE_MS = 2 * 60 * 1000; // no email to a visitor who is looking at the chat
const STAFF_ROLES = ["content_admin", "super_admin"];

/** Email addresses of the people who answer chats (the chat's owner, or all staff). */
export async function staffEmails(admin: Admin, ownerId: string | null): Promise<string[]> {
  let ids: string[] = [];
  if (ownerId) {
    ids = [ownerId];
  } else {
    const { data } = await admin.from("user_roles").select("user_id").in("role_id", STAFF_ROLES);
    ids = [...new Set((data ?? []).map((row) => row.user_id))];
  }
  const emails: string[] = [];
  for (const id of ids) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) emails.push(data.user.email);
  }
  return emails;
}

/** Claims the right to send, so two messages at once send one email. */
async function claim(admin: Admin, chatId: string, column: "notified_at" | "visitor_notified_at") {
  const since = new Date(Date.now() - QUIET_MS).toISOString();
  const now = new Date().toISOString();
  const { data } = await admin
    .from("help_chats")
    .update(column === "notified_at" ? { notified_at: now } : { visitor_notified_at: now })
    .eq("id", chatId)
    .or(`${column}.is.null,${column}.lt.${since}`)
    .select("id");
  return Boolean(data?.length);
}

/** A visitor wrote something a person should see. Never breaks the chat. */
export async function notifyTeam(admin: Admin, chat: ChatRow, text: string, reason: string) {
  if (!emailConfigured()) return;
  try {
    const to = await staffEmails(admin, chat.owner_id);
    if (!to.length) return;
    if (!(await claim(admin, chat.id, "notified_at"))) return;
    const mail = chatTeamAlertEmail({
      visitorName: chat.name ?? "",
      visitorEmail: chat.email,
      reason,
      text,
      url: `${siteUrl()}/admin/inbox?chat=${chat.id}`,
    });
    await sendEmail({ to, ...mail, replyTo: chat.email ?? undefined });
  } catch (cause) {
    console.error("help chat: notifyTeam", cause);
  }
}

/** The team replied: tell the visitor, unless they are on the page right now. */
export async function notifyVisitor(admin: Admin, chatId: string, helper: string, text: string) {
  if (!emailConfigured()) return;
  try {
    const { data: chat } = await admin
      .from("help_chats")
      .select("token, name, email, visitor_seen_at")
      .eq("id", chatId)
      .maybeSingle();
    if (!chat?.email) return;
    if (chat.visitor_seen_at && Date.now() - new Date(chat.visitor_seen_at).getTime() < ON_PAGE_MS) return;
    if (!(await claim(admin, chatId, "visitor_notified_at"))) return;
    const mail = chatReplyEmail({
      name: chat.name ?? "",
      helper: helper.split(/\s+/)[0] || "Our team",
      text,
      url: `${siteUrl()}/?chat=${chat.token}`,
    });
    await sendEmail({ to: chat.email, ...mail });
  } catch (cause) {
    console.error("help chat: notifyVisitor", cause);
  }
}
