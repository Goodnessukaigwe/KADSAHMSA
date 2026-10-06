import { randomUUID } from "node:crypto";

import { visitorGet, visitorPost, type ChatRow, type Deps, type MessageRow, type Store } from "../../lib/help/engine";

let failures = 0;
const check = (name: string, ok: boolean) => {
  console.log(ok ? "PASS" : "FAIL", name);
  if (!ok) failures++;
};

const chats = new Map<string, ChatRow>();
const msgs: (MessageRow & { chat_id: string })[] = [];
const store: Store = {
  findByToken: async (t) => [...chats.values()].find((c) => c.token === t) ?? null,
  messages: async (id) => msgs.filter((m) => m.chat_id === id && m.kind !== "note"),
  countRecentFromIp: async () => chats.size,
  create: async ({ page, name, email, userId }) => {
    const c = { id: randomUUID(), token: randomUUID(), created_at: "", updated_at: "", page, name, email, user_id: userId, topic: null, summary: null, client_turns: 0, handoff_at: null, staff_joined_at: null, status: "new", priority: "normal", owner_id: null, rating: null, rating_comment: null } as ChatRow;
    chats.set(c.id, c);
    return c;
  },
  update: async (id, patch) => Object.assign(chats.get(id)!, patch),
  append: async (chat, m, patch = {}) => {
    msgs.push({ id: randomUUID(), chat_id: chat.id, kind: m.kind, author: m.author, body: m.body, created_at: "" });
    return Object.assign(chats.get(chat.id)!, patch);
  },
  markVisitorSeen: async () => {},
};
const alerts: string[] = [];
const deps: Deps = { notifyTeam: async (_c, text) => void alerts.push(text), ipHash: "ip", userId: null, now: () => new Date() };

const bad = await visitorPost(store, deps, { text: "hi" });
check("needs a name", bad.status === 400);
const badMail = await visitorPost(store, deps, { text: "hi", name: "Ada", email: "nope" });
check("needs a valid email", badMail.status === 400);
const first = await visitorPost(store, deps, { text: "Hello", name: "Ada", email: "ada@example.com" });
const token = (first.json as { token: string }).token;
check("starts a chat and returns a token", first.status === 200 && Boolean(token));
check("team is alerted", alerts.length === 1);
check("resume by token", (await visitorGet(store, deps, token)).status === 200);
check("unknown token", (await visitorGet(store, deps, randomUUID())).status === 404);
const chat = [...chats.values()][0];
check("rating before resolved is refused", (await visitorPost(store, deps, { action: "rate", token, stars: 5 })).status === 409);
chat.status = "resolved";
check("rating after resolved works", (await visitorPost(store, deps, { action: "rate", token, stars: 5 })).status === 200);
await visitorPost(store, deps, { text: "One more thing", token });
check("a new message reopens and clears the rating", chat.status === "working" && chat.rating === null);
if (failures) process.exit(1);
