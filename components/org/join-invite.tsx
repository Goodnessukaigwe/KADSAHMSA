"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { redeemInvite } from "@/lib/org/actions";

export function JoinInvite({ code }: { code: string }) {
  const [state, setState] = useState<"pending" | "ok" | "error">("pending");
  const [message, setMessage] = useState("Joining this organisation…");

  useEffect(() => {
    if (!code) {
      setState("error");
      setMessage(
        "This page needs an invite code. Ask your organisation admin for a /join?code= link."
      );
      return;
    }
    let cancelled = false;
    void redeemInvite(code).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState("error");
        setMessage(result.error);
        return;
      }
      setState("ok");
      setMessage(
        "Your organisation membership is in place. If the invite included a course, it is now on My courses."
      );
    });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const title =
    state === "ok" ? "You have joined" : state === "error" ? "Could not join" : "Joining…";
  const href = state === "ok" ? "/my/courses" : "/my";
  const action = state === "ok" ? "Open my courses" : "Go to my courses";

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-16">
      <div className="w-full rounded-[24px] bg-white p-8">
        <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
          Organisation invite
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm text-neutral-500">{message}</p>
        {state !== "pending" ? (
          <Link
            href={href}
            className="mt-8 inline-flex h-11 items-center rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
          >
            {action}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
