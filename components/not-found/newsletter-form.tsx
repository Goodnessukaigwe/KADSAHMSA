"use client";

import { useState } from "react";

import { SplitCta } from "@/components/landing/split-cta";
import { site } from "@/lib/content/landing";
import { notFoundCopy } from "@/lib/content/not-found";

export function NewsletterForm() {
  const [email, setEmail] = useState("");

  return (
    <form
      className="w-full"
      onSubmit={(event) => {
        event.preventDefault();
        const next = email.trim();
        if (!next) return;
        window.location.href = `mailto:${site.email}?subject=${encodeURIComponent("Newsletter signup")}&body=${encodeURIComponent(`Please add ${next} to the KADSAMHSA training newsletter.`)}`;
      }}
    >
      <label
        htmlFor="not-found-email"
        className="text-[11px] font-medium tracking-[0.08em] text-white/50"
      >
        {notFoundCopy.emailLabel}
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        <input
          id="not-found-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={notFoundCopy.emailPlaceholder}
          autoComplete="email"
          className="h-12 min-w-0 flex-1 rounded-xl border border-white/15 bg-transparent px-4 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/40"
        />
        <SplitCta type="submit" variant="light" className="shrink-0">
          {notFoundCopy.subscribe}
        </SplitCta>
      </div>
    </form>
  );
}
