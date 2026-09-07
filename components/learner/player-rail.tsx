"use client";

import Link from "next/link";
import { Share2, Star } from "lucide-react";

import { SplitCta } from "@/components/landing/split-cta";
import { site } from "@/lib/content/landing";
import { cn } from "@/lib/utils";

type PlayerRailProps = {
  highlights?: { time: string; label: string; seconds: number }[];
  activeSeconds?: number;
  onHighlight?: (seconds: number) => void;
  quizHref: string;
  toc?: { title: string; items: { id: string; label: string }[] };
  previousHref?: string;
  nextHref?: string;
  nextLabel?: string;
  previousLabel?: string;
  nextPrimary?: boolean;
};

export function PlayerRail({
  highlights,
  activeSeconds = 0,
  onHighlight,
  quizHref,
  previousHref,
  nextHref,
  nextLabel = "Next",
  previousLabel = "Previous",
  nextPrimary = false,
  toc,
}: PlayerRailProps) {
  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kadsamhsa.svg" alt="" className="h-9 w-9 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{site.name}</p>
          <p className="text-xs text-neutral-400">Publisher</p>
        </div>
        <button
          type="button"
          className="flex size-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-500"
          onClick={() => {
            void navigator.clipboard?.writeText(window.location.href);
          }}
          aria-label="Share"
        >
          <Share2 className="size-4" />
        </button>
      </div>

      {toc ? (
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            {toc.title}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {toc.items.map((item, index) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={index === 0 ? "font-bold" : "text-neutral-500"}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {highlights?.length ? (
        <div>
          <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Video highlight
          </p>
          <ul className="mt-3 space-y-2">
            {highlights.map((item) => {
              const current = [...highlights]
                .reverse()
                .find((entry) => activeSeconds >= entry.seconds);
              const active = current?.seconds === item.seconds;
              return (
                <li key={item.time}>
                  <button
                    type="button"
                    onClick={() => onHighlight?.(item.seconds)}
                    className={cn(
                      "w-full text-left text-sm",
                      active ? "font-bold text-neutral-950" : "text-neutral-500"
                    )}
                  >
                    <span className="tabular-nums text-neutral-400">{item.time}</span>{" "}
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <SplitCta href={quizHref} className="w-full">
        Take quiz
      </SplitCta>

      <div>
        <p className="text-sm font-semibold">Rating</p>
        <div className="mt-1 flex items-center gap-1 text-amber-400">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star key={index} className="size-4 fill-current" />
          ))}
        </div>
        <p className="mt-1 text-xs text-neutral-400">1,234 reviews · 5 stars</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {previousHref ? (
          <Link
            href={previousHref}
            data-nav="previous"
            className="flex h-11 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-bold tracking-[0.12em] text-neutral-700 uppercase"
          >
            {previousLabel}
          </Link>
        ) : (
          <span className="flex h-11 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold tracking-[0.12em] text-neutral-400 uppercase">
            {previousLabel}
          </span>
        )}
        {nextHref ? (
          <Link
            href={nextHref}
            data-nav="next"
            className={cn(
              "flex h-11 items-center justify-center rounded-full text-[11px] font-bold tracking-[0.12em] uppercase",
              nextPrimary
                ? "bg-neutral-950 text-white"
                : "bg-neutral-200 text-neutral-700"
            )}
          >
            {nextLabel}
          </Link>
        ) : (
          <span className="flex h-11 items-center justify-center rounded-full bg-neutral-200 text-[11px] font-bold tracking-[0.12em] text-neutral-400 uppercase">
            {nextLabel}
          </span>
        )}
      </div>
    </aside>
  );
}
