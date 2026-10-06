"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Star, X } from "lucide-react";

import type { ChatState } from "@/components/help/use-help-chat";
import { cn } from "@/lib/utils";

const FIELD =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-neutral-950";

function clock(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

/** A Crisp-style messenger window: header, conversation, and a composer pinned to the bottom. */
export function ChatWindow({
  chat,
  page,
  defaultName,
  defaultEmail,
  onClose,
  onTicket,
}: {
  chat: ChatState;
  page: string;
  defaultName: string;
  defaultEmail: string;
  onClose: () => void;
  onTicket: () => void;
}) {
  const { view } = chat;
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [text, setText] = useState("");
  const [outgoing, setOutgoing] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [needDetails, setNeedDetails] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const count = view?.messages.length ?? 0;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [count, outgoing, needDetails]);

  useEffect(() => {
    if (view?.visitor.name) setName(view.visitor.name);
    if (view?.visitor.email) setEmail(view.visitor.email);
  }, [view?.visitor.name, view?.visitor.email]);

  const known = Boolean(view) || (name.trim() && email.trim());

  async function submit() {
    const body = text.trim();
    if (!body || chat.sending) return;
    if (!known) {
      setNeedDetails(true);
      return;
    }
    setOutgoing(body);
    setText("");
    const ok = await chat.send({ text: body, name, email, page });
    setOutgoing(null);
    if (!ok) {
      setText(body);
      if (!view) setNeedDetails(true);
    }
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Chat with the KADSAMHSA team"
      className="fixed inset-x-3 bottom-3 z-[55] flex h-[min(600px,calc(100dvh-1.5rem))] flex-col overflow-hidden rounded-[22px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.28)] ring-1 ring-black/10 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[380px]"
    >
      <header className="bg-neutral-950 px-5 pt-4 pb-5 text-white">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-neutral-950">
            K
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">KADSAMHSA Support</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/70">
              <span className={cn("size-2 rounded-full", chat.teamOnline ? "bg-emerald-400" : "bg-white/40")} />
              {chat.teamOnline ? "We’re online now" : "We usually reply within a few hours"}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close chat" className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-4 flex gap-1 rounded-full bg-white/10 p-1 text-[11px] font-bold tracking-[0.1em] uppercase" role="tablist">
          <span role="tab" aria-selected className="flex-1 rounded-full bg-white py-1.5 text-center text-neutral-950">
            Chat
          </span>
          <button type="button" role="tab" aria-selected={false} onClick={onTicket} className="flex-1 rounded-full py-1.5 text-center text-white/70 hover:text-white">
            Submit a ticket
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-2.5 overflow-y-auto bg-neutral-50 px-4 py-4">
        <div className="flex">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ring-1 ring-black/5">
            Hello! Ask us anything about the courses, your account or certificates. A member of the team will reply here.
          </div>
        </div>

        {view?.messages.map((m) =>
          m.kind === "system" ? (
            <p key={m.id} className="py-1 text-center text-xs text-neutral-400">
              {m.body}
            </p>
          ) : (
            <div key={m.id} className={cn("flex flex-col", m.kind === "client" ? "items-end" : "items-start")}>
              {m.kind === "team" && m.author ? (
                <span className="mb-0.5 ml-1 text-[11px] font-semibold text-neutral-400">{m.author}</span>
              ) : null}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  m.kind === "client"
                    ? "rounded-br-md bg-neutral-950 text-white"
                    : "rounded-bl-md bg-white shadow-sm ring-1 ring-black/5"
                )}
              >
                {m.body}
              </div>
              <span className="mt-0.5 px-1 text-[10px] text-neutral-400">{clock(m.at)}</span>
            </div>
          )
        )}

        {outgoing ? (
          <div className="flex flex-col items-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md bg-neutral-950/70 px-3.5 py-2.5 text-sm whitespace-pre-wrap text-white">
              {outgoing}
            </div>
            <span className="mt-0.5 px-1 text-[10px] text-neutral-400">Sending…</span>
          </div>
        ) : null}

        {needDetails && !view ? (
          <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-black/5">
            <p className="text-sm font-semibold">So we can reply, who are you?</p>
            <div className="mt-2.5 space-y-2">
              <input className={FIELD} placeholder="Your name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
              <input className={FIELD} type="email" placeholder="Your email" value={email} maxLength={200} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <p className="mt-2 text-xs text-neutral-400">Press send again when you are done.</p>
          </div>
        ) : null}

        {view?.resolved ? (
          <div className="rounded-2xl bg-white p-3.5 text-center shadow-sm ring-1 ring-black/5">
            {view.rating ? (
              <p className="text-sm text-neutral-600">Thanks for rating this chat {view.rating.stars} out of 5.</p>
            ) : (
              <>
                <p className="text-sm font-semibold">This chat is resolved. How did we do?</p>
                <div className="mt-2 flex justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} stars`}>
                      <Star className={cn("size-6", n <= stars ? "fill-[#c9a227] text-[#c9a227]" : "text-neutral-300")} />
                    </button>
                  ))}
                </div>
                {stars ? (
                  <>
                    <input className={cn(FIELD, "mt-2.5")} placeholder="Anything to add? (optional)" value={comment} maxLength={600} onChange={(e) => setComment(e.target.value)} />
                    <button type="button" onClick={() => chat.rate(stars, comment)} className="mt-2.5 h-9 rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase">
                      Send rating
                    </button>
                  </>
                ) : null}
              </>
            )}
            <p className="mt-2 text-xs text-neutral-400">Write below to reopen the conversation.</p>
          </div>
        ) : null}

        {chat.error ? <p className="text-center text-xs text-red-600">{chat.error}</p> : null}
        <div ref={bottom} />
      </div>

      <div className="border-t border-neutral-200 bg-white p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 py-1.5 pr-1.5 pl-3.5 focus-within:border-neutral-950">
          <textarea
            rows={1}
            value={text}
            maxLength={1500}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Write a message…"
            aria-label="Message"
            className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={chat.sending || !text.trim()}
            aria-label="Send message"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white disabled:opacity-30"
          >
            <ArrowUp className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
