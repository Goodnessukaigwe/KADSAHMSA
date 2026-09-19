"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ChromeAvatarLink } from "@/components/profile/chrome-avatar";
import { clearLearner, firstNameOf } from "@/lib/learner-session";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function ChromeAccount({
  name,
  email,
  avatarUrl,
  profileHref,
  tone = "dark",
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
  profileHref: string;
  tone?: "light" | "dark";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const firstName = firstNameOf(name || "Learner");
  const onDark = tone === "dark";

  async function logout() {
    if (pending) return;
    setPending(true);
    try {
      await createClient().auth.signOut();
    } catch {
      // Still clear leftover client keys below.
    }
    clearLearner();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-2.5">
      <p
        className={cn(
          "min-w-0 max-w-[5.5rem] truncate text-sm font-semibold leading-tight sm:max-w-[10rem]",
          onDark ? "text-white" : "text-neutral-950"
        )}
        title={email}
      >
        {firstName}
      </p>
      <ChromeAvatarLink
        href={profileHref}
        name={name}
        avatarUrl={avatarUrl}
        className={cn("size-9 text-xs", onDark ? "" : "bg-neutral-950 text-white")}
      />
      <button
        type="button"
        onClick={logout}
        disabled={pending}
        className={cn(
          "inline-flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-semibold transition-colors disabled:opacity-50",
          onDark
            ? "border border-white/20 text-white hover:bg-white/10"
            : "border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
        )}
      >
        {pending ? "Logging out…" : "Log out"}
      </button>
    </div>
  );
}
