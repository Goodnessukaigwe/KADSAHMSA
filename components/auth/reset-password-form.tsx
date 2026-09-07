"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { authCopy } from "@/lib/content/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const copy = authCopy.reset;

export function ResetPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"request" | "update">("request");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let supabase;
    try {
      supabase = createClient();
    } catch {
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setMode("update");
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("update");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const requestValid = email.includes("@") && email.trim().length > 5;
  const updateValid = password.length >= 8;

  async function onRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requestValid || pending) return;
    setError(null);
    setInfo(null);
    setPending(true);

    try {
      const supabase = createClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        }
      );
      if (resetError) {
        setError(resetError.message);
        setPending(false);
        return;
      }
      setInfo(copy.sent);
      setPending(false);
    } catch (cause) {
      setError(
        cause instanceof Error && /Missing NEXT_PUBLIC_SUPABASE/.test(cause.message)
          ? "Authentication is not configured. Add Supabase keys to .env.local."
          : "Could not send a reset link. Try again."
      );
      setPending(false);
    }
  }

  async function onUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!updateValid || pending) return;
    setError(null);
    setPending(true);

    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        setPending(false);
        return;
      }
      router.push("/my");
      router.refresh();
    } catch {
      setError("Could not save your new password. Try again.");
      setPending(false);
    }
  }

  if (mode === "update") {
    return (
      <form onSubmit={onUpdate} className="flex flex-col">
        <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-neutral-950 sm:text-[2.35rem]">
          {copy.updateTitle}
        </h1>
        <label className="mt-8 text-[13px] text-neutral-500" htmlFor="new-password">
          {copy.newPassword}
        </label>
        <input
          id="new-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={copy.newPasswordPlaceholder}
          className="mt-2 h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
        />
        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={!updateValid || pending}
          className={cn(
            "mt-8 h-12 w-full rounded-full text-[12px] font-bold tracking-[0.18em] uppercase transition-colors",
            updateValid && !pending
              ? "bg-neutral-950 text-white hover:bg-neutral-800"
              : "cursor-not-allowed bg-neutral-200 text-neutral-400"
          )}
        >
          {pending ? "Saving…" : copy.updateSubmit}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onRequest} className="flex flex-col">
      <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-neutral-950 sm:text-[2.35rem]">
        {copy.title}
      </h1>
      <p className="mt-3 text-sm text-neutral-500">{copy.hint}</p>
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
      {error ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {info ? (
        <p className="mt-4 text-sm text-neutral-600" role="status">
          {info}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!requestValid || pending}
        className={cn(
          "mt-8 h-12 w-full rounded-full text-[12px] font-bold tracking-[0.18em] uppercase transition-colors",
          requestValid && !pending
            ? "bg-neutral-950 text-white hover:bg-neutral-800"
            : "cursor-not-allowed bg-neutral-200 text-neutral-400"
        )}
      >
        {pending ? "Sending…" : copy.submit}
      </button>
      <p className="mt-5 text-center text-sm text-neutral-500">
        <Link href="/login" className="font-bold text-neutral-950 hover:underline">
          {copy.backToLogin}
        </Link>
      </p>
    </form>
  );
}
