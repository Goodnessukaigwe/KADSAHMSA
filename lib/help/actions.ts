"use server";

import { findUserIdByEmail } from "@/lib/auth/admin-users";
import {
  getCertificatesForUser,
  getStaffLearner,
  getStaffLearnerLearning,
  type StaffActivityItem,
  type StaffCertificate,
  type StaffEnrolmentProgress,
} from "@/lib/certificates/queries";
import { notifyVisitor } from "@/lib/help/notify";
import { getUserRoles, hasRole, requireSessionProfile, requireStaff } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  HelpChatPriority,
  HelpChatStatus,
  HelpMessageKind,
} from "@/lib/supabase/database";

type ChatRecord = Database["public"]["Tables"]["help_chats"]["Row"];

export type InboxChat = Pick<
  ChatRecord,
  | "id"
  | "created_at"
  | "name"
  | "email"
  | "page"
  | "status"
  | "priority"
  | "owner_id"
  | "last_from"
  | "last_text"
  | "last_at"
  | "rating"
  | "rating_comment"
  | "summary"
>;
export type InboxMessage = {
  id: string;
  kind: HelpMessageKind;
  author: string | null;
  body: string;
  created_at: string;
};
export type SavedReply = { id: string; title: string; body: string };
export type Teammate = { id: string; name: string };
export type InboxResult<T> = ({ ok: true } & T) | { ok: false; error: string };

const LIST_COLUMNS =
  "id, created_at, name, email, page, status, priority, owner_id, last_from, last_text, last_at, rating, rating_comment, summary";
const STATUSES: HelpChatStatus[] = ["new", "working", "waiting", "resolved"];
const PRIORITIES: HelpChatPriority[] = ["urgent", "high", "normal"];
const MISSING = "The chat tables are not set up yet. Apply supabase/apply-help-chat.sql in the Supabase SQL editor.";

function failure(message: string | undefined) {
  console.error("help inbox:", message);
  return {
    ok: false as const,
    error: message && /help_chats|help_messages|saved_replies|schema cache/.test(message) ? MISSING : "Something went wrong.",
  };
}

export async function listInbox(): Promise<
  InboxResult<{
    chats: InboxChat[];
    team: Teammate[];
    saved: SavedReply[];
    me: string;
    isSuperAdmin: boolean;
  }>
> {
  const { user, roles: myRoles } = await requireStaff();
  const admin = createAdminClient();
  const [chats, saved, roles] = await Promise.all([
    admin.from("help_chats").select(LIST_COLUMNS).order("last_at", { ascending: false, nullsFirst: false }).limit(200),
    admin.from("saved_replies").select("id, title, body").order("title"),
    admin.from("user_roles").select("user_id").in("role_id", ["content_admin", "super_admin"]),
  ]);
  if (chats.error) return failure(chats.error.message);

  const team: Teammate[] = [];
  for (const id of [...new Set((roles.data ?? []).map((row) => row.user_id))]) {
    const { data } = await admin.from("profiles").select("full_name").eq("id", id).maybeSingle();
    const auth = data?.full_name ? null : await admin.auth.admin.getUserById(id);
    team.push({ id, name: data?.full_name?.trim() || auth?.data.user?.email || "Team member" });
  }
  return {
    ok: true,
    chats: (chats.data ?? []) as InboxChat[],
    team,
    saved: (saved.data ?? []) as SavedReply[],
    me: user.id,
    isSuperAdmin: hasRole(myRoles, "super_admin"),
  };
}

export async function openChat(
  id: string
): Promise<InboxResult<{ chat: InboxChat & { token: string }; messages: InboxMessage[] }>> {
  await requireStaff();
  const admin = createAdminClient();
  const { data: chat, error } = await admin
    .from("help_chats")
    .select(`${LIST_COLUMNS}, token`)
    .eq("id", id)
    .maybeSingle();
  if (error) return failure(error.message);
  if (!chat) return { ok: false, error: "Chat not found." };
  const { data: messages, error: messagesError } = await admin
    .from("help_messages")
    .select("id, kind, author, body, created_at")
    .eq("chat_id", id)
    .order("created_at", { ascending: true })
    .limit(500);
  if (messagesError) return failure(messagesError.message);
  return { ok: true, chat: chat as InboxChat & { token: string }, messages: (messages ?? []) as InboxMessage[] };
}

export async function replyToChat(id: string, text: string, internal = false): Promise<InboxResult<object>> {
  await requireStaff();
  const profile = await requireSessionProfile();
  const body = text.trim().slice(0, 4000);
  if (!body) return { ok: false, error: "Write something first." };
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: chat, error } = await admin
    .from("help_chats")
    .select("id, owner_id, staff_joined_at, status")
    .eq("id", id)
    .maybeSingle();
  if (error) return failure(error.message);
  if (!chat) return { ok: false, error: "Chat not found." };

  const { error: insertError } = await admin.from("help_messages").insert({
    chat_id: id,
    kind: internal ? "note" : "team",
    author: profile.name,
    author_id: profile.id,
    body,
  });
  if (insertError) return failure(insertError.message);

  if (!internal) {
    const { error: updateError } = await admin
      .from("help_chats")
      .update({
        last_from: "team",
        last_text: body.slice(0, 200),
        last_at: now,
        updated_at: now,
        staff_joined_at: chat.staff_joined_at ?? now,
        owner_id: chat.owner_id ?? profile.id,
        status: chat.status === "resolved" ? "resolved" : "waiting",
      })
      .eq("id", id);
    if (updateError) return failure(updateError.message);
    await notifyVisitor(admin, id, profile.name, body);
  }
  return { ok: true };
}

export async function updateChat(
  id: string,
  patch: { status?: string; priority?: string; owner_id?: string | null }
): Promise<InboxResult<object>> {
  await requireStaff();
  const admin = createAdminClient();
  const update: Database["public"]["Tables"]["help_chats"]["Update"] = { updated_at: new Date().toISOString() };
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status as HelpChatStatus)) return { ok: false, error: "Bad status." };
    update.status = patch.status as HelpChatStatus;
  }
  if (patch.priority !== undefined) {
    if (!PRIORITIES.includes(patch.priority as HelpChatPriority)) return { ok: false, error: "Bad priority." };
    update.priority = patch.priority as HelpChatPriority;
  }
  if (patch.owner_id !== undefined) update.owner_id = patch.owner_id;
  const { error } = await admin.from("help_chats").update(update).eq("id", id);
  return error ? failure(error.message) : { ok: true };
}

export async function saveReply(title: string, body: string): Promise<InboxResult<object>> {
  const { user } = await requireStaff();
  const t = title.trim().slice(0, 80);
  const b = body.trim().slice(0, 2000);
  if (!t || !b) return { ok: false, error: "Add a title and the reply text." };
  const { error } = await createAdminClient().from("saved_replies").insert({ title: t, body: b, created_by: user.id });
  return error ? failure(error.message) : { ok: true };
}

export async function removeSavedReply(id: string): Promise<InboxResult<object>> {
  await requireStaff();
  const { error } = await createAdminClient().from("saved_replies").delete().eq("id", id);
  return error ? failure(error.message) : { ok: true };
}

/** Called while the inbox is open, so the chat widget can say the team is online. */
export async function inboxHeartbeat(): Promise<void> {
  const { user } = await requireStaff();
  await createAdminClient()
    .from("help_team_presence")
    .upsert({ user_id: user.id, last_seen_at: new Date().toISOString() });
}

/** Chats waiting for a reply, for the navigation badge. */
export async function countChatsNeedingReply(): Promise<number> {
  await requireStaff();
  try {
    const { count, error } = await createAdminClient()
      .from("help_chats")
      .select("id", { count: "exact", head: true })
      .eq("last_from", "client")
      .neq("status", "resolved");
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

export type VisitorProfile = {
  name: string;
  email: string | null;
  page: string | null;
  startedAt: string;
  account: null | {
    id: string;
    name: string;
    email: string;
    joined: string;
    organisationName: string;
    roles: string[];
    isAdmin: boolean;
    enrolments: StaffEnrolmentProgress[];
    certificates: StaffCertificate[];
    activity: StaffActivityItem[];
  };
  otherChats: { id: string; status: string; lastText: string | null; lastAt: string | null }[];
  tickets: { id: string; category: string; message: string; createdAt: string; status: string }[];
};

/** Everything we know about the person in a conversation, for the inbox side panel. */
export async function getVisitorProfile(chatId: string): Promise<InboxResult<{ profile: VisitorProfile }>> {
  await requireStaff();
  const admin = createAdminClient();
  const { data: chat, error } = await admin
    .from("help_chats")
    .select("id, name, email, page, user_id, created_at")
    .eq("id", chatId)
    .maybeSingle();
  if (error) return failure(error.message);
  if (!chat) return { ok: false, error: "Chat not found." };

  const userId = chat.user_id ?? (chat.email ? await findUserIdByEmail(admin, chat.email) : null);
  const learner = userId ? await getStaffLearner(userId) : null;

  let account: VisitorProfile["account"] = null;
  if (userId && learner) {
    const [learning, certificates, roles] = await Promise.all([
      getStaffLearnerLearning(userId),
      getCertificatesForUser(userId),
      getUserRoles(userId),
    ]);
    account = {
      id: userId,
      name: learner.name,
      email: learner.email,
      joined: learner.joined,
      organisationName: learner.organisationName,
      roles,
      isAdmin: roles.some((role) => role !== "learner"),
      enrolments: learning.enrolments,
      certificates,
      activity: learning.activity.slice(0, 8),
    };
  }

  // Separate queries (not one .or() string) so an odd email cannot change the filter.
  const chatRows = new Map<string, { id: string; status: string; last_text: string | null; last_at: string | null }>();
  const ticketRows = new Map<
    string,
    { id: string; category: string; message: string; created_at: string; status: string }
  >();
  const email = chat.email?.trim() ?? "";
  await Promise.all([
    email
      ? admin
          .from("help_chats")
          .select("id, status, last_text, last_at")
          .eq("email", email)
          .neq("id", chatId)
          .limit(10)
          .then(({ data }) => (data ?? []).forEach((row) => chatRows.set(row.id, row)))
      : Promise.resolve(),
    userId
      ? admin
          .from("help_chats")
          .select("id, status, last_text, last_at")
          .eq("user_id", userId)
          .neq("id", chatId)
          .limit(10)
          .then(({ data }) => (data ?? []).forEach((row) => chatRows.set(row.id, row)))
      : Promise.resolve(),
    email
      ? admin
          .from("feedback_tickets")
          .select("id, category, message, created_at, status")
          .eq("submitter_email", email)
          .limit(10)
          .then(({ data }) => (data ?? []).forEach((row) => ticketRows.set(row.id, row)))
      : Promise.resolve(),
    userId
      ? admin
          .from("feedback_tickets")
          .select("id, category, message, created_at, status")
          .eq("user_id", userId)
          .limit(10)
          .then(({ data }) => (data ?? []).forEach((row) => ticketRows.set(row.id, row)))
      : Promise.resolve(),
  ]);
  const others = [...chatRows.values()].sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""));
  const tickets = [...ticketRows.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    ok: true,
    profile: {
      name: chat.name ?? "",
      email: chat.email,
      page: chat.page,
      startedAt: chat.created_at,
      account,
      otherChats: others.map((row) => ({
        id: row.id,
        status: row.status,
        lastText: row.last_text,
        lastAt: row.last_at,
      })),
      tickets: tickets.map((row) => ({
        id: row.id,
        category: row.category,
        message: row.message,
        createdAt: row.created_at,
        status: row.status,
      })),
    },
  };
}
