"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MessageSquare, X } from "lucide-react";
import { usePathname } from "next/navigation";

import { FEEDBACK_CATEGORIES, feedbackCopy } from "@/lib/content/feedback";
import { submitFeedback } from "@/lib/feedback/actions";
import type { FeedbackCategory } from "@/lib/feedback/types";
import { firstNameOf } from "@/lib/learner-session";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "kadsamhsa.feedback-fab";
const DRAG_THRESHOLD = 8;
const PAD = 12;

type Pos = { x: number; y: number };

function readStored(): Pos | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Pos;
    if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(pos: Pos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pos));
  } catch {
    // ignore quota / private mode
  }
}

function clamp(x: number, y: number, width: number, height: number): Pos {
  const maxX = Math.max(PAD, window.innerWidth - width - PAD);
  const maxY = Math.max(PAD, window.innerHeight - height - PAD);
  return {
    x: Math.min(maxX, Math.max(PAD, x)),
    y: Math.min(maxY, Math.max(PAD, y)),
  };
}

function defaultPos(width: number, height: number): Pos {
  return clamp(window.innerWidth - width - 20, window.innerHeight - height - 20, width, height);
}

export function FeedbackWidget({ submitterName }: { submitterName: string | null }) {
  const pathname = usePathname() || "/";
  const titleId = useId();
  const displayName = submitterName ? firstNameOf(submitterName) : null;

  const buttonRef = useRef<HTMLButtonElement>(null);
  const startRef = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });
  const draggedRef = useRef(false);
  const posRef = useRef<Pos | null>(null);

  const [pos, setPos] = useState<Pos | null>(null);
  const [open, setOpen] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<FeedbackCategory | null>(null);
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const applyPos = useCallback((next: Pos) => {
    posRef.current = next;
    setPos(next);
  }, []);

  const measure = useCallback(() => {
    const node = buttonRef.current;
    if (!node) return { width: 40, height: 40 };
    const rect = node.getBoundingClientRect();
    return { width: rect.width || 40, height: rect.height || 40 };
  }, []);

  const place = useCallback(() => {
    const { width, height } = measure();
    const stored = posRef.current ?? readStored();
    applyPos(stored ? clamp(stored.x, stored.y, width, height) : defaultPos(width, height));
  }, [applyPos, measure]);

  useEffect(() => {
    place();
    const onResize = () => {
      const current = posRef.current;
      if (!current) {
        place();
        return;
      }
      const { width, height } = measure();
      applyPos(clamp(current.x, current.y, width, height));
    };
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [applyPos, measure, place]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => {
      setOpen(false);
      setSuccess(false);
      setMessage("");
      setCategory(null);
      setError(null);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [success]);

  function openPanel() {
    setSuccess(false);
    setError(null);
    setOpen(true);
  }

  function onPointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    const current = posRef.current;
    if (!current) return;
    draggedRef.current = false;
    startRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: current.x,
      y: current.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const dx = event.clientX - startRef.current.pointerX;
    const dy = event.clientY - startRef.current.pointerY;
    if (!draggedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    draggedRef.current = true;
    const { width, height } = measure();
    applyPos(clamp(startRef.current.x + dx, startRef.current.y + dy, width, height));
  }

  function onPointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (draggedRef.current) {
      const current = posRef.current;
      if (current) writeStored(current);
    }
  }

  function onClick(event: React.MouseEvent<HTMLButtonElement>) {
    if (draggedRef.current) {
      event.preventDefault();
      draggedRef.current = false;
      return;
    }
    openPanel();
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!category) {
      setError(feedbackCopy.pickCategory);
      return;
    }
    setPending(true);
    setError(null);
    const result = await submitFeedback({
      message,
      category,
      pagePath: pathname,
      website: honeypot,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
  }

  return (
    <>
      {!open ? (
        <button
          ref={buttonRef}
          type="button"
          aria-label={feedbackCopy.button}
          title={feedbackCopy.button}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClick={onClick}
          className={cn(
            "fixed z-[55] flex size-10 touch-none items-center justify-center rounded-full bg-[#0b4d2c] text-white shadow-[0_10px_24px_rgba(11,77,44,0.28)] ring-2 ring-[#c9a227]/80",
            "select-none",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a227]",
            pos ? "opacity-100" : "opacity-0"
          )}
          style={
            pos
              ? { left: pos.x, top: pos.y }
              : { right: 20, bottom: 20 }
          }
        >
          <MessageSquare className="size-4" strokeWidth={2.2} />
        </button>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-[55] flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={feedbackCopy.close}
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-md rounded-[28px] bg-white p-5 shadow-2xl sm:p-7"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950"
            >
              <X className="size-4" />
              <span className="sr-only">{feedbackCopy.close}</span>
            </button>

            {success ? (
              <div className="py-6 text-center">
                <p className="text-[11px] font-bold tracking-[0.16em] text-[#0b4d2c] uppercase">
                  {feedbackCopy.successTitle}
                </p>
                <h2 id={titleId} className="mt-3 text-2xl font-bold tracking-tight">
                  {feedbackCopy.successTitle}
                </h2>
                <p className="mt-2 text-sm text-neutral-500">{feedbackCopy.successBody}</p>
              </div>
            ) : (
              <form onSubmit={onSubmit}>
                <h2 id={titleId} className="pr-10 text-2xl font-bold tracking-tight">
                  {feedbackCopy.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                  {feedbackCopy.subcopy}
                </p>

                <p className="mt-5 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                  {feedbackCopy.categoryLabel}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {FEEDBACK_CATEGORIES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setCategory(value)}
                      className={cn(
                        "h-9 rounded-full px-3 text-[11px] font-bold tracking-[0.04em]",
                        category === value
                          ? "bg-[#0b4d2c] text-white"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      )}
                    >
                      {feedbackCopy.categories[value]}
                    </button>
                  ))}
                </div>

                <label className="mt-5 block">
                  <span className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                    {feedbackCopy.messageLabel}
                  </span>
                  <textarea
                    required
                    minLength={20}
                    maxLength={2000}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder={feedbackCopy.messagePlaceholder}
                    className="mt-2 min-h-[140px] w-full resize-y rounded-2xl border border-neutral-200 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#0b4d2c]"
                  />
                </label>

                <label className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                  Company
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                  />
                </label>

                <p className="mt-3 text-sm text-neutral-500">
                  {feedbackCopy.sendingAsPrefix}{" "}
                  <strong className="text-neutral-950">
                    {displayName || feedbackCopy.anonymous}
                  </strong>
                </p>

                {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

                <button
                  type="submit"
                  disabled={pending}
                  className="mt-5 h-12 w-full rounded-full bg-[#0b4d2c] text-[11px] font-bold tracking-[0.16em] text-white uppercase disabled:opacity-60"
                >
                  {pending ? feedbackCopy.sending : feedbackCopy.submit}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
