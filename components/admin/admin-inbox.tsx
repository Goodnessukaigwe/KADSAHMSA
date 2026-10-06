"use client";

import { useCallback, useEffect, useState } from "react";

import { VisitorPanel } from "@/components/admin/visitor-panel";
import {
  inboxHeartbeat,
  listInbox,
  openChat,
  removeSavedReply,
  replyToChat,
  saveReply,
  updateChat,
  type InboxChat,
  type InboxMessage,
  type SavedReply,
  type Teammate,
} from "@/lib/help/actions";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  new: "New",
  working: "Working",
  waiting: "Waiting on visitor",
  resolved: "Resolved",
};
const FILTERS = ["needs reply", "all", "resolved"] as const;
type Filter = (typeof FILTERS)[number];

function ago(iso: string | null) {
  if (!iso) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}

const FIELD = "rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-950";

export function AdminInbox({ initialChat }: { initialChat: string | null }) {
  const [chats, setChats] = useState<InboxChat[]>([]);
  const [team, setTeam] = useState<Teammate[]>([]);
  const [saved, setSaved] = useState<SavedReply[]>([]);
  const [me, setMe] = useState("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("needs reply");
  const [selected, setSelected] = useState<string | null>(initialChat);
  const [current, setCurrent] = useState<(InboxChat & { token: string }) | null>(null);
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const result = await listInbox();
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    setChats(result.chats);
    setTeam(result.team);
    setSaved(result.saved);
    setMe(result.me);
    setIsSuperAdmin(result.isSuperAdmin);
  }, []);

  const load = useCallback(async (id: string) => {
    const result = await openChat(id);
    if (result.ok) {
      setCurrent(result.chat);
      setMessages(result.messages);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void inboxHeartbeat();
    const id = window.setInterval(() => {
      void refresh();
      void inboxHeartbeat();
    }, 15000);
    return () => window.clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!selected) return;
    void load(selected);
    const id = window.setInterval(() => void load(selected), 8000);
    return () => window.clearInterval(id);
  }, [selected, load]);

  const visible = chats.filter((c) =>
    filter === "all" ? true : filter === "resolved" ? c.status === "resolved" : c.status !== "resolved" && c.last_from === "client"
  );

  async function send() {
    if (!selected || !text.trim()) return;
    setBusy(true);
    const result = await replyToChat(selected, text, internal);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setText("");
    await Promise.all([load(selected), refresh()]);
  }

  async function change(patch: { status?: string; priority?: string; owner_id?: string | null }) {
    if (!selected) return;
    await updateChat(selected, patch);
    await Promise.all([load(selected), refresh()]);
  }

  async function addSaved() {
    const title = window.prompt("Name for this saved reply");
    if (!title || !text.trim()) return;
    const result = await saveReply(title, text);
    if (!result.ok) setError(result.error);
    await refresh();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Chat inbox</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Messages from the chat on the website. Replies appear in the visitor’s chat and are emailed if they have left.
        Submitted tickets stay under Feedback.
      </p>
      {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="mt-5 grid gap-4 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_340px]">
        <section className="rounded-[24px] bg-white p-3">
          <div className="flex gap-1 rounded-full bg-neutral-100 p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "h-8 flex-1 rounded-full text-[11px] font-bold tracking-[0.06em] uppercase",
                  filter === f ? "bg-neutral-950 text-white" : "text-neutral-500"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <ul className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto">
            {visible.length === 0 ? <li className="p-4 text-center text-sm text-neutral-400">Nothing here.</li> : null}
            {visible.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setSelected(c.id)}
                  className={cn(
                    "w-full rounded-2xl p-3 text-left hover:bg-neutral-50",
                    selected === c.id && "bg-neutral-100"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold">{c.name || "Visitor"}</span>
                    {c.priority !== "normal" ? (
                      <span className="rounded-full bg-red-100 px-2 text-[10px] font-bold text-red-700 uppercase">
                        {c.priority}
                      </span>
                    ) : null}
                    <span className="ml-auto text-xs text-neutral-400">{ago(c.last_at)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-neutral-500">
                    {c.last_from === "team" ? "You: " : ""}
                    {c.last_text}
                  </span>
                  <span className="mt-1 block text-[10px] font-bold tracking-wide text-neutral-400 uppercase">
                    {STATUS_LABEL[c.status]}
                    {c.last_from === "client" && c.status !== "resolved" ? " · needs reply" : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-[24px] bg-white p-4 sm:p-5">
          {!current || current.id !== selected ? (
            <p className="py-16 text-center text-sm text-neutral-400">Pick a conversation.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold">{current.name || "Visitor"}</h2>
                  <p className="truncate text-sm text-neutral-500">
                    {current.email ? <a className="underline" href={`mailto:${current.email}`}>{current.email}</a> : null}
                    {current.page ? ` · from ${current.page}` : ""}
                  </p>
                </div>
                <select className={FIELD} value={current.status} onChange={(e) => change({ status: e.target.value })} aria-label="Status">
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <select className={FIELD} value={current.priority} onChange={(e) => change({ priority: e.target.value })} aria-label="Priority">
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <select
                  className={FIELD}
                  value={current.owner_id ?? ""}
                  onChange={(e) => change({ owner_id: e.target.value || null })}
                  aria-label="Owner"
                >
                  <option value="">Unassigned</option>
                  {team.map((t) => (
                    <option key={t.id} value={t.id}>{t.id === me ? `${t.name} (me)` : t.name}</option>
                  ))}
                </select>
              </div>

              {current.rating ? (
                <p className="mt-3 rounded-xl bg-[#c9a227]/15 p-3 text-sm">
                  Rated {current.rating}/5{current.rating_comment ? `: ${current.rating_comment}` : ""}
                </p>
              ) : null}

              <div className="mt-4 max-h-[50vh] min-h-[200px] space-y-2 overflow-y-auto rounded-2xl bg-neutral-50 p-3">
                {messages.map((m) =>
                  m.kind === "system" ? (
                    <p key={m.id} className="text-center text-xs text-neutral-400">{m.body}</p>
                  ) : (
                    <div key={m.id} className={cn("flex", m.kind === "client" ? "justify-start" : "justify-end")}>
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap",
                          m.kind === "client" && "border border-neutral-200 bg-white",
                          m.kind === "team" && "bg-neutral-950 text-white",
                          m.kind === "note" && "border border-dashed border-[#c9a227] bg-[#c9a227]/10"
                        )}
                      >
                        <span className="mb-0.5 block text-[11px] font-bold opacity-60">
                          {m.kind === "note" ? `Internal note · ${m.author}` : m.author} · {ago(m.created_at)}
                        </span>
                        {m.body}
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="mt-3">
                {saved.length ? (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {saved.map((r) => (
                      <span key={r.id} className="inline-flex items-center overflow-hidden rounded-full bg-neutral-100 text-xs">
                        <button type="button" className="px-3 py-1.5 font-semibold hover:bg-neutral-200" onClick={() => setText(r.body)}>
                          {r.title}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove saved reply ${r.title}`}
                          className="px-2 py-1.5 text-neutral-400 hover:text-red-600"
                          onClick={async () => {
                            await removeSavedReply(r.id);
                            await refresh();
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
                <textarea
                  className={cn(FIELD, "min-h-[96px] w-full resize-y", internal && "border-dashed border-[#c9a227] bg-[#c9a227]/10")}
                  placeholder={internal ? "Internal note (the visitor cannot see this)" : "Write a reply"}
                  value={text}
                  maxLength={4000}
                  onChange={(e) => setText(e.target.value)}
                />
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-neutral-600">
                    <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                    Internal note
                  </label>
                  <button type="button" onClick={addSaved} className="text-sm font-semibold text-neutral-500 underline">
                    Save as reply
                  </button>
                  <button
                    type="button"
                    disabled={busy || !text.trim()}
                    onClick={send}
                    className="ml-auto h-10 rounded-full bg-neutral-950 px-6 text-[11px] font-bold tracking-[0.14em] text-white uppercase disabled:opacity-50"
                  >
                    {internal ? "Add note" : "Send reply"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
        {current && current.id === selected ? (
          <VisitorPanel
            key={current.id}
            chatId={current.id}
            isSuperAdmin={isSuperAdmin}
            onOpenChat={(id) => setSelected(id)}
            onRemoved={() => {
              void refresh();
              if (selected) void load(selected);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
