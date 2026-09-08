"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { homeAfterSignIn } from "@/lib/auth/home";
import { authCopy } from "@/lib/content/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const copy = authCopy.login;

function safeNext(path: string | undefined, fallback: string) {
  if (path && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return fallback;
}

export function LoginForm({
  initialError = null,
  nextPath,
}: {
  initialError?: string | null;
  nextPath?: string;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError);
  const [pending, setPending] = useState(false);

  const valid = email.includes("@") && email.trim().length > 5 && password.length >= 8;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) return;
    setError(null);
    setPending(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError || !data.user) {
        setError(
          signInError?.message === "Invalid login credentials"
            ? "Wrong email or password."
            : signInError?.message || "Could not log in. Try again."
        );
        setPending(false);
        return;
      }

      const home = await homeAfterSignIn(supabase, data.user.id);
      router.push(safeNext(nextPath, home));
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error && /Missing NEXT_PUBLIC_SUPABASE/.test(cause.message)
          ? "Authentication is not configured. Add Supabase keys to .env.local."
          : "Could not log in. Try again."
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-neutral-950 sm:text-[2.35rem]">
        {copy.title}
      </h1>

      <label className="mt-8 text-[13px] text-neutral-500" htmlFor="email">
        {copy.email}
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={copy.emailPlaceholder}
        className="mt-2 h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
      />

      <label className="mt-5 text-[13px] text-neutral-500" htmlFor="password">
        {copy.password}
      </label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        minLength={8}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={copy.passwordPlaceholder}
        className="mt-2 h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
      />
      <div className="mt-2 flex justify-end">
        <Link
          href="/reset-password"
          className="text-[12px] text-neutral-500 hover:text-neutral-800"
        >
          {copy.forgot}
        </Link>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!valid || pending}
        className={cn(
          "mt-8 h-12 w-full rounded-full text-[12px] font-bold tracking-[0.18em] uppercase transition-colors",
          valid && !pending
            ? "bg-neutral-950 text-white hover:bg-neutral-800"
            : "cursor-not-allowed bg-neutral-200 text-neutral-400"
        )}
      >
        {pending ? "Logging in…" : copy.submit}
      </button>

      <p className="mt-5 text-center text-sm text-neutral-500">
        {copy.noAccount}{" "}
        <Link href="/register" className="font-bold text-neutral-950 hover:underline">
          {copy.registerLink}
        </Link>
      </p>
    </form>
  );
}
