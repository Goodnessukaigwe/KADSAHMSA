"use client";

import { useEffect, useState } from "react";
import { Maximize, Pause, Play, Settings, Volume2 } from "lucide-react";

import { CourseCover } from "@/components/courses/course-cover";
import { formatClock } from "@/lib/content/dptc";
import { cn } from "@/lib/utils";

type SimulatedVideoProps = {
  poster?: string | null;
  title: string;
  duration: number;
  current: number;
  onSeek: (seconds: number) => void;
};

export function SimulatedVideo({
  poster,
  title,
  duration,
  current,
  onSeek,
}: SimulatedVideoProps) {
  const [playing, setPlaying] = useState(false);
  const progress = duration ? current / duration : 0;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      onSeek(Math.min(duration, current + 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [playing, current, duration, onSeek]);

  useEffect(() => {
    if (current >= duration) setPlaying(false);
  }, [current, duration]);

  return (
    <div className="overflow-hidden rounded-[22px] bg-black">
      <div className="relative aspect-video min-w-0">
        <CourseCover
          src={poster}
          title={title}
          sizes="(max-width: 1024px) 100vw, 70vw"
        />
        {!playing ? (
          <button
            type="button"
            className="absolute inset-0 flex items-center justify-center"
            onClick={() => setPlaying(true)}
            aria-label="Play"
          >
            <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-neutral-950 shadow-lg">
              <Play className="ml-0.5 size-7 fill-current" />
            </span>
          </button>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 flex min-w-0 items-center gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 py-3 text-white sm:gap-3 sm:px-4">
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "Pause" : "Play"}
            className="shrink-0"
          >
            {playing ? (
              <Pause className="size-4 fill-current" />
            ) : (
              <Play className="size-4 fill-current" />
            )}
          </button>
          <Volume2 className="hidden size-4 shrink-0 sm:block" />
          <span className="shrink-0 text-[11px] tabular-nums">
            {formatClock(current)}/{formatClock(duration)}
          </span>
          <div className="relative h-1 min-w-0 flex-1 rounded-full bg-white/25">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-red-500"
              style={{ width: `${progress * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={duration}
              value={current}
              onChange={(event) => onSeek(Number(event.target.value))}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
              aria-label="Seek"
            />
          </div>
          <span className="hidden text-[11px] sm:inline">360P</span>
          <span className="hidden text-[11px] sm:inline">1x</span>
          <Settings className="hidden size-3.5 shrink-0 sm:block" />
          <Maximize className="hidden size-3.5 shrink-0 sm:block" />
        </div>
      </div>
    </div>
  );
}

export function PlayPoster({
  src,
  title,
  onPlay,
}: {
  src?: string | null;
  title: string;
  onPlay?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="relative block w-full overflow-hidden rounded-[22px]"
    >
      <span className="relative block aspect-video">
        <CourseCover
          src={src}
          title={title}
          sizes="(max-width: 1024px) 100vw, 70vw"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-neutral-950 shadow-lg">
            <Play className="ml-0.5 size-7 fill-current" />
          </span>
        </span>
      </span>
    </button>
  );
}

export function ProgressTrack({
  value,
  className,
  tone = "default",
}: {
  value: number;
  className?: string;
  tone?: "default" | "complete";
}) {
  return (
    <div className={cn("h-1.5 overflow-hidden rounded-full bg-neutral-200", className)}>
      <div
        className={cn(
          "h-full rounded-full",
          tone === "complete" ? "bg-emerald-500" : "bg-neutral-400"
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
