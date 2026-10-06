"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { VisitorView } from "@/lib/help/engine";

const TOKEN_KEY = "kadsamhsa.chat-token";
const SEEN_KEY = "kadsamhsa.chat-seen";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // private mode: the chat still works for this visit
  }
}

export type ChatState = {
  /** null until we know; false hides the chat tab (tables or keys missing). */
  available: boolean | null;
  teamOnline: boolean;
  view: VisitorView | null;
  unread: number;
  sending: boolean;
  error: string | null;
  send: (input: { text: string; name: string; email: string; page: string }) => Promise<boolean>;
  askForPerson: (input: { name: string; email: string; page: string }) => Promise<boolean>;
  rate: (stars: number, comment: string) => Promise<void>;
  markSeen: () => void;
  forget: () => void;
};

const MESSAGES: Record<string, string> = {
  name_required: "Please tell us your name.",
  bad_email: "Please enter a valid email so we can reply.",
  empty: "Write a message first.",
  too_many_chats: "Too many chats from this network. Please try again later.",
  chat_limit: "This chat has reached its limit. Please email us instead.",
};

/** Talks to /api/help-chat. Polls faster while the panel is open. */
export function useHelpChat(open: boolean): ChatState {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [teamOnline, setTeamOnline] = useState(false);
  const [view, setView] = useState<VisitorView | null>(null);
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  const countTeam = (v: VisitorView) => v.messages.filter((m) => m.kind === "team").length;

  const apply = useCallback((next: VisitorView, isOpen: boolean) => {
    setView(next);
    const seen = Number(read(SEEN_KEY) ?? 0);
    const teamCount = countTeam(next);
    if (isOpen) write(SEEN_KEY, String(teamCount));
    setUnread(isOpen ? 0 : Math.max(0, teamCount - seen));
  }, []);

  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // First load: is chat available, and is there a chat to resume (also from an email link)?
  useEffect(() => {
    const fromLink = new URLSearchParams(window.location.search).get("chat");
    if (fromLink && /^[0-9a-f-]{36}$/i.test(fromLink)) write(TOKEN_KEY, fromLink);
    tokenRef.current = read(TOKEN_KEY);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/help-chat", { cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          setAvailable(false);
          return;
        }
        const data = (await res.json()) as { team_online?: boolean };
        setAvailable(true);
        setTeamOnline(Boolean(data.team_online));
      } catch {
        if (!cancelled) setAvailable(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const poll = useCallback(async () => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const res = await fetch(`/api/help-chat?token=${encodeURIComponent(token)}`, { cache: "no-store" });
      if (res.status === 404) {
        write(TOKEN_KEY, null);
        write(SEEN_KEY, null);
        tokenRef.current = null;
        setView(null);
        return;
      }
      if (res.ok) apply((await res.json()) as VisitorView, openRef.current);
    } catch {
      // try again on the next tick
    }
  }, [apply]);

  useEffect(() => {
    if (!available) return;
    void poll();
    const id = window.setInterval(poll, open ? 8000 : 15000);
    return () => window.clearInterval(id);
  }, [available, open, poll]);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      setSending(true);
      setError(null);
      try {
        const res = await fetch("/api/help-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...body, token: tokenRef.current ?? undefined }),
        });
        const data = (await res.json().catch(() => ({}))) as VisitorView & { error?: string };
        if (!res.ok) {
          setError(MESSAGES[data.error ?? ""] ?? "Something went wrong. Please try again.");
          return false;
        }
        if (data.token) {
          tokenRef.current = data.token;
          write(TOKEN_KEY, data.token);
        }
        apply(data, true);
        return true;
      } catch {
        setError("Could not reach the server. Check your connection.");
        return false;
      } finally {
        setSending(false);
      }
    },
    [apply]
  );

  return {
    available,
    teamOnline,
    view,
    unread,
    sending,
    error,
    send: ({ text, name, email, page }) => post({ action: "message", text, name, email, page }),
    askForPerson: ({ name, email, page }) => post({ action: "person", name, email, page }),
    rate: async (stars, comment) => {
      await post({ action: "rate", stars, comment });
    },
    markSeen: () => {
      if (view) write(SEEN_KEY, String(countTeam(view)));
      setUnread(0);
    },
    forget: () => {
      write(TOKEN_KEY, null);
      write(SEEN_KEY, null);
      tokenRef.current = null;
      setView(null);
      setUnread(0);
    },
  };
}
