"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { requestPasswordReset, updatePassword } from "@/lib/auth/actions";
import { authCopy } from "@/lib/content/auth";
import { site } from "@/lib/content/landing";
import { cn } from "@/lib/utils";

const copy = authCopy.reset;

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  const valid = email.includes("@") && email.trim().length > 5;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || pending) return;
    setError(null);
    setSent(false);
    setPending(true);

    try {
      const result = await requestPasswordReset(email.trim().toLowerCase());
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      setSent(true);
      setPending(false);
    } catch {
      setError("Could not send a reset link. Try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col">
      <h1 className="text-[2rem] leading-tight font-bold tracking-tight text-neutral-950 sm:text-[2.35rem]">
        {copy.title}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-neutral-500">{copy.hint}</p>

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

      {sent ? (
        <p className="mt-4 text-sm text-neutral-600" role="status">
          {copy.sent}
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
        {pending ? "Sending…" : copy.submit}
      </button>

      <p className="mt-5 text-center text-sm text-neutral-500">
        <Link href="/login" className="font-bold text-neutral-950 hover:underline">
          {copy.backToLogin}
        </Link>
        {" · "}
        <a
          href={`mailto:${site.email}`}
          className="font-bold text-neutral-950 hover:underline"
        >
          {copy.contact}
        </a>
      </p>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const updateValid = password.length >= 8;

  async function onUpdate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!updateValid || pending) return;
    setError(null);
    setPending(true);

    try {
      const result = await updatePassword(password);
      if (!result.ok) {
        setError(result.error);
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
