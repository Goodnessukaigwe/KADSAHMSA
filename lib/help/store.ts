import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ChatRow, MessageRow, NewMessage, Store } from "@/lib/help/engine";
import type { Database } from "@/lib/supabase/database";

type Admin = SupabaseClient<Database>;
type Chats = Database["public"]["Tables"]["help_chats"];

const CHAT_COLUMNS =
  "id, token, created_at, updated_at, page, name, email, user_id, topic, summary, client_turns, handoff_at, staff_joined_at, status, priority, owner_id, rating, rating_comment";

function fail(action: string, message: string | undefined): never {
  throw new Error(`help chat: ${action} failed${message ? `: ${message}` : ""}`);
}

const LAST_FROM: Record<NewMessage["kind"], string | null> = {
  client: "client",
  assistant: "assistant",
  team: "team",
  note: null,
  system: null,
};

/** The Supabase-backed implementation of the chat engine's `Store`. Service role only. */
export function supabaseStore(admin: Admin): Store {
  const update = async (chatId: string, patch: Chats["Update"]) => {
    const { data, error } = await admin
      .from("help_chats")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", chatId)
      .select(CHAT_COLUMNS)
      .single();
    if (error || !data) fail("update", error?.message);
    return data as ChatRow;
  };

  return {
    async findByToken(token) {
      const { data, error } = await admin
        .from("help_chats")
        .select(CHAT_COLUMNS)
        .eq("token", token)
        .maybeSingle();
      if (error) fail("read", error.message);
      return (data as ChatRow | null) ?? null;
    },

    async messages(chatId) {
      const { data, error } = await admin
        .from("help_messages")
        .select("id, kind, author, body, created_at")
        .eq("chat_id", chatId)
        .neq("kind", "note")
        .order("created_at", { ascending: true })
        .limit(500);
      if (error) fail("read messages", error.message);
      return (data ?? []) as MessageRow[];
    },

    async countRecentFromIp(ipHash, sinceIso) {
      const { count, error } = await admin
        .from("help_chats")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", sinceIso);
      if (error) fail("count", error.message);
      return count ?? 0;
    },

    async create({ page, ipHash, name, email, userId }) {
      const { data, error } = await admin
        .from("help_chats")
        .insert({ page, ip_hash: ipHash, name, email, user_id: userId })
        .select(CHAT_COLUMNS)
        .single();
      if (error || !data) fail("create", error?.message);
      return data as ChatRow;
    },

    update,

    async append(chat, message, patch = {}) {
      const { error } = await admin.from("help_messages").insert({
        chat_id: chat.id,
        kind: message.kind,
        author: message.author,
        body: message.body,
      });
      if (error) fail("save message", error.message);

      const lastFrom = LAST_FROM[message.kind];
      return update(chat.id, {
        ...(patch as Chats["Update"]),
        ...(lastFrom
          ? { last_from: lastFrom, last_text: message.body.slice(0, 200), last_at: new Date().toISOString() }
          : {}),
      });
    },

    async markVisitorSeen(chatId) {
      await admin
        .from("help_chats")
        .update({ visitor_seen_at: new Date().toISOString() })
        .eq("id", chatId);
    },
  };
}

/** Is anyone from the team looking at the inbox right now? */
export async function teamOnline(admin: Admin, windowMs = 2 * 60 * 1000) {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count } = await admin
    .from("help_team_presence")
    .select("user_id", { count: "exact", head: true })
    .gte("last_seen_at", since);
  return (count ?? 0) > 0;
}
