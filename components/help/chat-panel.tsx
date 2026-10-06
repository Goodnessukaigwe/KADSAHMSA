"use client";

import { useEffect, useRef, useState } from "react";
import { Star } from "lucide-react";

import type { ChatState } from "@/components/help/use-help-chat";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-neutral-950";

export function ChatPanel({
  chat,
  page,
  defaultName,
  defaultEmail,
}: {
  chat: ChatState;
  page: string;
  defaultName: string;
  defaultEmail: string;
}) {
  const { view } = chat;
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [text, setText] = useState("");
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const count = view?.messages.length ?? 0;

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [count]);

  useEffect(() => {
    if (view?.visitor.name) setName(view.visitor.name);
    if (view?.visitor.email) setEmail(view.visitor.email);
  }, [view?.visitor.name, view?.visitor.email]);

  async function onSend(event: React.FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    if (await chat.send({ text, name, email, page })) setText("");
  }

  const starting = !view;

  return (
    <div className="flex flex-col">
      <p className="text-sm leading-relaxed text-neutral-500">
        {chat.teamOnline
          ? "Our team is online. Send us a message and we will reply here."
          : "Leave a message. We reply here, and by email if you have left the page."}
      </p>

      {view ? (
        <div className="mt-4 max-h-[320px] min-h-[160px] space-y-2 overflow-y-auto rounded-2xl bg-neutral-50 p-3">
          {view.messages.map((m) =>
            m.kind === "system" ? (
              <p key={m.id} className="text-center text-xs text-neutral-400">
                {m.body}
              </p>
            ) : (
              <div key={m.id} className={cn("flex", m.kind === "client" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                    m.kind === "client" ? "bg-neutral-950 text-white" : "border border-neutral-200 bg-white text-neutral-950"
                  )}
                >
                  {m.kind === "team" && m.author ? (
                    <span className="mb-0.5 block text-[11px] font-bold text-neutral-400">{m.author}</span>
                  ) : null}
                  {m.body}
                </div>
              </div>
            )
          )}
          <div ref={bottom} />
        </div>
      ) : null}

      {view?.resolved ? (
        <div className="mt-4 rounded-2xl border border-neutral-200 p-4 text-center">
          {view.rating ? (
            <p className="text-sm text-neutral-600">Thank you for rating this chat {view.rating.stars} out of 5.</p>
          ) : (
            <>
              <p className="text-sm font-semibold">This chat was marked resolved. How did we do?</p>
              <div className="mt-2 flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} stars`}>
                    <Star className={cn("size-6", n <= stars ? "fill-[#c9a227] text-[#c9a227]" : "text-neutral-300")} />
                  </button>
                ))}
              </div>
              {stars ? (
                <>
                  <input
                    className={cn(INPUT, "mt-3")}
                    placeholder="Anything to add? (optional)"
                    value={comment}
                    maxLength={600}
                    onChange={(e) => setComment(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => chat.rate(stars, comment)}
                    className="mt-3 h-10 rounded-full bg-neutral-950 px-6 text-[11px] font-bold tracking-[0.14em] text-white uppercase"
                  >
                    Send rating
                  </button>
                </>
              ) : null}
            </>
          )}
          <p className="mt-3 text-xs text-neutral-400">Write below to reopen the conversation.</p>
        </div>
      ) : null}

      <form onSubmit={onSend} className="mt-4 space-y-3">
        {starting ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={INPUT} required placeholder="Your name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
            <input className={INPUT} required type="email" placeholder="Your email" value={email} maxLength={200} onChange={(e) => setEmail(e.target.value)} />
          </div>
        ) : null}
        <textarea
          required
          className={cn(INPUT, "min-h-[88px] resize-y")}
          placeholder="How can we help?"
          value={text}
          maxLength={1500}
          onChange={(e) => setText(e.target.value)}
        />
        {chat.error ? <p className="text-sm text-red-600">{chat.error}</p> : null}
        <button
          type="submit"
          disabled={chat.sending}
          className="h-12 w-full rounded-full bg-neutral-950 text-[11px] font-bold tracking-[0.16em] text-white uppercase disabled:opacity-60"
        >
          {chat.sending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}
