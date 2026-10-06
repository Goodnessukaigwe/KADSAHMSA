/**
 * The live-chat rules, independent of storage. The visitor API route feeds requests through
 * `visitorGet` / `visitorPost` with a `Store` (Supabase in production, in memory in tests).
 *
 *  - A visitor starts a chat with a name and email (so the team can reply by email).
 *  - Every message goes to the team, who answer from the admin inbox.
 *  - The visitor can ask for a person explicitly, and rate the chat once it is resolved.
 */

import type { HelpChatStatus, HelpMessageKind } from "@/lib/supabase/database";

export const MAX_TEAM_TURNS = 200;
export const MAX_TEXT = 1500;
export const NEW_CHATS_PER_HOUR = 5;

export type ChatRow = {
  id: string;
  token: string;
  created_at: string;
  updated_at: string;
  page: string | null;
  name: string | null;
  email: string | null;
  user_id: string | null;
  topic: string | null;
  summary: string | null;
  client_turns: number;
  handoff_at: string | null;
  staff_joined_at: string | null;
  status: HelpChatStatus;
  priority: "urgent" | "high" | "normal";
  owner_id: string | null;
  rating: number | null;
  rating_comment: string | null;
};

export type MessageRow = {
  id: string;
  kind: HelpMessageKind;
  author: string | null;
  body: string;
  created_at: string;
};

export type NewMessage = { kind: HelpMessageKind; author: string | null; body: string };

export type Store = {
  findByToken(token: string): Promise<ChatRow | null>;
  /** Everything the visitor may see (no internal notes), oldest first. */
  messages(chatId: string): Promise<MessageRow[]>;
  countRecentFromIp(ipHash: string, sinceIso: string): Promise<number>;
  create(input: {
    page: string;
    ipHash: string;
    name: string;
    email: string;
    userId: string | null;
  }): Promise<ChatRow>;
  update(chatId: string, patch: Partial<ChatRow>): Promise<ChatRow>;
  /** Adds a message and refreshes the chat's last-message fields. */
  append(chat: ChatRow, message: NewMessage, patch?: Partial<ChatRow>): Promise<ChatRow>;
  markVisitorSeen(chatId: string): Promise<void>;
};

export type Deps = {
  notifyTeam: (chat: ChatRow, text: string, reason: string) => Promise<void>;
  ipHash: string;
  userId: string | null;
  now: () => Date;
};

export type ChatMessageView = {
  id: string;
  kind: "client" | "assistant" | "team" | "system";
  author: string | null;
  body: string;
  at: string;
};

export type VisitorView = {
  enabled: true;
  visitor: { name: string | null; email: string | null };
  resolved: boolean;
  rating: { stars: number; comment: string | null } | null;
  helper: string | null;
  messages: ChatMessageView[];
  team: boolean;
  handed: boolean;
  left: number;
  token?: string;
  notice?: "with_team";
};

export type EngineResponse = { status: number; json: unknown };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PERSON = "person";

class EngineError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

const fail = (status: number, error: string): EngineResponse => ({ status, json: { error } });

export function isChatToken(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

function visitorDetails(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim().slice(0, 100);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 200);
  if (!name && !email) return null;
  if (!name) throw new EngineError(400, "name_required");
  if (!EMAIL.test(email)) throw new EngineError(400, "bad_email");
  return { name, email };
}

const wantsPerson = (chat: ChatRow) => chat.topic === PERSON;
const withTeam = (chat: ChatRow) => Boolean(chat.staff_joined_at);

function helperName(messages: MessageRow[]) {
  const last = [...messages].reverse().find((m) => m.kind === "team");
  return last ? String(last.author ?? "").split(/\s+/)[0] || null : null;
}

export function buildView(
  chat: ChatRow,
  messages: MessageRow[],
  extra: Partial<Pick<VisitorView, "token" | "notice">> = {}
): VisitorView {
  const team = withTeam(chat);
  return {
    enabled: true,
    visitor: { name: chat.name, email: chat.email },
    resolved: chat.status === "resolved",
    rating: chat.rating ? { stars: chat.rating, comment: chat.rating_comment } : null,
    helper: helperName(messages),
    messages: messages
      .filter((m): m is MessageRow & { kind: ChatMessageView["kind"] } => m.kind !== "note")
      .map((m) => ({ id: m.id, kind: m.kind, author: m.author, body: m.body, at: m.created_at })),
    team,
    handed: Boolean(chat.handoff_at) || team,
    left: Math.max(0, MAX_TEAM_TURNS - chat.client_turns),
    ...extra,
  };
}

export async function visitorGet(store: Store, deps: Deps, token: string): Promise<EngineResponse> {
  if (!isChatToken(token)) return fail(404, "not_found");
  const chat = await store.findByToken(token);
  if (!chat) return fail(404, "not_found");
  if (withTeam(chat)) await store.markVisitorSeen(chat.id);
  return { status: 200, json: buildView(chat, await store.messages(chat.id)) };
}

export async function visitorPost(
  store: Store,
  deps: Deps,
  body: Record<string, unknown>
): Promise<EngineResponse> {
  try {
    return await handlePost(store, deps, body);
  } catch (cause) {
    if (cause instanceof EngineError) return fail(cause.status, cause.message);
    throw cause;
  }
}

async function handlePost(
  store: Store,
  deps: Deps,
  body: Record<string, unknown>
): Promise<EngineResponse> {
  const token = typeof body.token === "string" ? body.token : "";
  const action = typeof body.action === "string" ? body.action : "message";
  const details = visitorDetails(body);
  let chat = isChatToken(token) ? await store.findByToken(token) : null;

  const respond = async (current: ChatRow, extra: Partial<Pick<VisitorView, "token" | "notice">> = {}) => ({
    status: 200,
    json: buildView(current, await store.messages(current.id), extra),
  });

  // A new chat needs the visitor's details and respects the per-network limit.
  let created = false;
  const ensureChat = async () => {
    if (chat) return chat;
    const since = new Date(deps.now().getTime() - 3600e3).toISOString();
    if ((await store.countRecentFromIp(deps.ipHash, since)) >= NEW_CHATS_PER_HOUR) {
      throw new EngineError(429, "too_many_chats");
    }
    if (!details) throw new EngineError(400, "name_required");
    chat = await store.create({
      page: String(body.page ?? "").slice(0, 200),
      ipHash: deps.ipHash,
      name: details.name,
      email: details.email,
      userId: deps.userId,
    });
    created = true;
    return chat;
  };
  const tokenExtra = () => (created && chat ? { token: chat.token } : {});

  if (action === "rate") {
    if (!chat) return fail(404, "not_found");
    if (chat.status !== "resolved") return fail(409, "not_resolved");
    const stars = Number(body.stars);
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) return fail(400, "bad_rating");
    const comment = String(body.comment ?? "").trim().slice(0, 600) || null;
    const saved = await store.update(chat.id, {
      rating: stars,
      rating_comment: comment,
    });
    await store.append(saved, {
      kind: "system",
      author: chat.name || "Visitor",
      body: `Rated this chat ${stars} out of 5${comment ? `: ${comment}` : ""}`,
    });
    return respond(saved);
  }

  if (action === "profile") {
    if (!chat) return fail(404, "not_found");
    if (!details) return fail(400, "name_required");
    return respond(await store.update(chat.id, details));
  }

  if (action === PERSON) {
    const current = await ensureChat();
    if (withTeam(current) || wantsPerson(current)) return respond(current, tokenExtra());
    const now = deps.now().toISOString();
    const updated = await store.append(
      current,
      { kind: "client", author: current.name, body: "I’d like to talk to a person, please." },
      {
        topic: PERSON,
        handoff_at: current.handoff_at ?? now,
        summary: current.summary ?? "Asked to talk to a person.",
        status: "new",
        client_turns: current.client_turns + 1,
      }
    );
    chat = updated;
    await deps.notifyTeam(updated, "Asked to talk to a person.", "asked to talk to a person in the chat");
    return respond(updated, { ...tokenExtra(), notice: "with_team" });
  }

  // A normal message.
  const text = String(body.text ?? "").trim().slice(0, MAX_TEXT);
  if (!text) return fail(400, "empty");

  const current = await ensureChat();
  if (!created && details && (details.name !== current.name || details.email !== current.email)) {
    chat = await store.update(current.id, details);
  }
  const active = chat as ChatRow;
  const team = withTeam(active);
  if (active.client_turns >= MAX_TEAM_TURNS) {
    return fail(429, "chat_limit");
  }

  const nowIso = deps.now().toISOString();
  const reopened = active.status === "resolved";

  // Every message goes to the team.
  const toTeam = async (notice?: "with_team") => {
    const patch: Partial<ChatRow> = {
      client_turns: active.client_turns + 1,
      handoff_at: active.handoff_at ?? nowIso,
      status: reopened || active.status === "waiting" ? "working" : active.status,
    };
    if (reopened && active.rating) {
      patch.rating = null;
      patch.rating_comment = null;
    }
    const updated = await store.append(active, { kind: "client", author: active.name, body: text }, patch);
    chat = updated;
    await deps.notifyTeam(updated, text, team ? "replied in the chat" : "left a message in the chat");
    return respond(updated, { ...tokenExtra(), ...(notice ? { notice } : {}) });
  };

  return toTeam(team ? undefined : "with_team");
}
