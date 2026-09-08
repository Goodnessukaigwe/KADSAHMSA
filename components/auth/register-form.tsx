"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { registerAccount } from "@/lib/auth/actions";
import { homeAfterSignIn } from "@/lib/auth/home";
import { authCopy } from "@/lib/content/auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const copy = authCopy.register;

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const valid =
    name.trim().length >= 2 &&
    email.includes("@") &&
    email.trim().length > 5 &&
    password.length >= 8 &&
    acceptedPrivacy;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) return;
    setError(null);
    setPending(true);

    const fullName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const created = await registerAccount(
        fullName,
        normalizedEmail,
        password,
        acceptedPrivacy
      );
      if (!created.ok) {
        setError(created.error);
        setPending(false);
        return;
      }

      const supabase = createClient();
      const { data: session, error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (signInError || !session.user) {
        setError(signInError?.message || "Account created. Log in to continue.");
        setPending(false);
        return;
      }

      const home = await homeAfterSignIn(supabase, session.user.id);
      router.push(home);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error && /Missing NEXT_PUBLIC_SUPABASE/.test(cause.message)
          ? "Authentication is not configured. Add Supabase keys to .env.local."
          : "Could not create your account. Try again."
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-neutral-950 sm:text-[2.35rem]">
        {copy.title}
      </h1>

      <label className="mt-8 text-[13px] text-neutral-500" htmlFor="full-name">
        {copy.fullName}
      </label>
      <input
        id="full-name"
        name="name"
        type="text"
        autoComplete="name"
        required
        minLength={2}
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder={copy.fullNamePlaceholder}
        className="mt-2 h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
      />

      <label className="mt-5 text-[13px] text-neutral-500" htmlFor="email">
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
        autoComplete="new-password"
        required
        minLength={8}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder={copy.passwordPlaceholder}
        className="mt-2 h-12 rounded-xl border border-neutral-200 bg-white px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-400 focus:border-neutral-400"
      />

      <label className="mt-6 flex items-start gap-3 text-sm leading-relaxed text-neutral-600">
        <input
          id="privacy-consent"
          name="privacyConsent"
          type="checkbox"
          required
          checked={acceptedPrivacy}
          onChange={(event) => setAcceptedPrivacy(event.target.checked)}
          className="mt-1 size-4 shrink-0 rounded border-neutral-300"
        />
        <span>
          {copy.consentBefore}{" "}
          <Link href="/privacy" className="font-bold text-neutral-950 underline underline-offset-2">
            {copy.consentLink}
          </Link>{" "}
          {copy.consentAfter}
        </span>
      </label>

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
        {pending ? "Creating account…" : copy.submit}
      </button>

      <p className="mt-5 text-center text-sm text-neutral-500">
        {copy.haveAccount}{" "}
        <Link href="/login" className="font-bold text-neutral-950 hover:underline">
          {copy.loginLink}
        </Link>
      </p>
    </form>
  );
}
