"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { site, teamCta } from "@/lib/content/landing";

export function TeamCta() {
  const [email, setEmail] = useState("");

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <Image
        src="/Panel%20Discussion/IMG_1642.jpg"
        alt="KADSAMHSA staff at a panel discussion"
        width={1536}
        height={1024}
        className="h-full min-h-[420px] w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-5 pt-28 sm:p-7">
        <h3 className="max-w-sm text-xl font-semibold text-white sm:text-2xl">
          {teamCta.title}
        </h3>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/75">
          {teamCta.body}
        </p>
        <form
          className="mt-5 flex items-stretch gap-1"
          onSubmit={(event) => {
            event.preventDefault();
            const next = email.trim();
            if (!next) return;
            window.location.href = `mailto:${site.email}?subject=${encodeURIComponent("Team training enquiry")}&body=${encodeURIComponent(`Please contact me at ${next} about organisation training.`)}`;
          }}
        >
          <label className="sr-only" htmlFor="team-email">
            {teamCta.placeholder}
          </label>
          <input
            id="team-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={teamCta.placeholder}
            className="h-12 min-w-0 flex-1 rounded-full bg-white px-4 text-sm text-neutral-950 outline-none placeholder:text-neutral-400"
          />
          <button
            type="submit"
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-white"
            aria-label={teamCta.submit}
          >
            <ArrowRight className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
