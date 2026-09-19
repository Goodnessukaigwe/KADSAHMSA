"use client";

import Link from "next/link";
import { Share2 } from "lucide-react";

import { SplitCta } from "@/components/landing/split-cta";
import { ProgressTrack } from "@/components/learner/simulated-video";
import { site } from "@/lib/content/landing";
import type { PlayerTocGroup } from "@/lib/courses/types";
import { cn } from "@/lib/utils";

type PlayerRailProps = {
  highlights?: { time: string; label: string; seconds: number }[];
  activeSeconds?: number;
  onHighlight?: (seconds: number) => void;
  quizHref?: string;
  toc?: PlayerTocGroup[];
  progressPercent?: number;
  previousHref?: string;
  nextHref?: string;
  nextLabel?: string;
  previousLabel?: string;
  nextPrimary?: boolean;
  onNext?: () => void;
  navPending?: boolean;
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
  progressPercent,
  onNext,
  navPending = false,
}: PlayerRailProps) {
  return (
    <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-24">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/kadsamhsa.svg" alt="" className="h-9 w-9 object-contain" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{site.name}</p>
          <p className="text-xs text-neutral-400">Publisher</p>
        </div>
        <button
          type="button"
          className="outline-control flex size-9 items-center justify-center rounded-full text-neutral-500"
          onClick={() => {
            void navigator.clipboard?.writeText(window.location.href);
          }}
          aria-label="Share"
        >
          <Share2 className="size-4" />
        </button>
      </div>

      {typeof progressPercent === "number" ? (
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              Progress
            </p>
            <p className="text-[11px] text-neutral-400">{Math.round(progressPercent)}%</p>
          </div>
          <ProgressTrack
            className="mt-2"
            value={progressPercent}
            tone={progressPercent >= 100 ? "complete" : "default"}
          />
        </div>
      ) : null}

      {toc?.length ? (
        <div className="max-h-[min(24rem,50vh)] space-y-4 overflow-y-auto">
          {toc.map((group) => (
            <div key={group.id}>
              <p
                className={cn(
                  "text-[11px] font-bold tracking-[0.14em] uppercase",
                  group.current ? "text-neutral-950" : "text-neutral-400"
                )}
              >
                {group.title}
              </p>
              <ul className="mt-2 space-y-2 text-sm">
                {group.items.map((item, index) => {
                  const current = item.current ?? (!item.href && index === 0);
                  const className = current ? "font-bold" : "text-neutral-500";
                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link href={item.href} className={className}>
                          {item.label}
                        </Link>
                      ) : (
                        <span className={className}>{item.label}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
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

      {quizHref ? (
        <SplitCta href={quizHref} className="w-full">
          Take quiz
        </SplitCta>
      ) : null}

      <div className="grid min-w-0 grid-cols-2 gap-2">
        {previousHref ? (
          <Link
            href={previousHref}
            data-nav="previous"
            aria-disabled={navPending || undefined}
            tabIndex={navPending ? -1 : undefined}
            className={cn(
              "flex h-11 min-w-0 items-center justify-center rounded-full bg-neutral-200 px-2 text-center text-[10px] font-bold tracking-[0.08em] text-neutral-700 uppercase leading-tight sm:text-[11px] sm:tracking-[0.12em]",
              navPending && "pointer-events-none opacity-50"
            )}
          >
            {previousLabel}
          </Link>
        ) : (
          <span className="flex h-11 min-w-0 items-center justify-center rounded-full bg-neutral-100 px-2 text-center text-[10px] font-bold tracking-[0.08em] text-neutral-400 uppercase leading-tight sm:text-[11px] sm:tracking-[0.12em]">
            {previousLabel}
          </span>
        )}
        {nextHref ? (
          onNext ? (
            <button
              type="button"
              data-nav="next"
              onClick={onNext}
              disabled={navPending}
              aria-busy={navPending || undefined}
              className={cn(
                "flex h-11 min-w-0 items-center justify-center rounded-full px-2 text-center text-[10px] font-bold tracking-[0.08em] uppercase leading-tight sm:text-[11px] sm:tracking-[0.12em] disabled:pointer-events-none disabled:opacity-50",
                nextPrimary
                  ? "bg-neutral-950 text-white"
                  : "bg-neutral-200 text-neutral-700"
              )}
            >
              {nextLabel}
            </button>
          ) : (
            <Link
              href={nextHref}
              data-nav="next"
              aria-disabled={navPending || undefined}
              tabIndex={navPending ? -1 : undefined}
              className={cn(
                "flex h-11 min-w-0 items-center justify-center rounded-full px-2 text-center text-[10px] font-bold tracking-[0.08em] uppercase leading-tight sm:text-[11px] sm:tracking-[0.12em]",
                nextPrimary
                  ? "bg-neutral-950 text-white"
                  : "bg-neutral-200 text-neutral-700",
                navPending && "pointer-events-none opacity-50"
              )}
            >
              {nextLabel}
            </Link>
          )
        ) : (
          <span className="flex h-11 min-w-0 items-center justify-center rounded-full bg-neutral-200 px-2 text-center text-[10px] font-bold tracking-[0.08em] text-neutral-400 uppercase leading-tight sm:text-[11px] sm:tracking-[0.12em]">
            {nextLabel}
          </span>
        )}
      </div>
    </aside>
  );
}
