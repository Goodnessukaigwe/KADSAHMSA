"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Tag, Clock, Layers, Award } from "lucide-react";

import { PlayerRail } from "@/components/learner/player-rail";
import { SimulatedVideo } from "@/components/learner/simulated-video";
import {
  adjacentHrefs,
  dptcCourse,
  dptcModules,
  introDurationSeconds,
  introHighlights,
} from "@/lib/content/dptc";
import { markModuleComplete, savePlayerSeconds } from "@/lib/learning/actions";

const facts = [
  { icon: Tag, label: "Price", value: "Free" },
  { icon: Clock, label: "Duration", value: "Included" },
  { icon: Layers, label: "Level", value: "Foundational" },
  { icon: Award, label: "Certification", value: "Included" },
] as const;

export function CoursePlayer({
  slug,
  initialSeconds,
}: {
  slug: string;
  initialSeconds: number;
}) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const introModule = dptcModules[0];
  const courseSlug = slug || dptcCourse.slug;
  const nav = adjacentHrefs(courseSlug, introModule.slug);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    void markModuleComplete(dptcCourse.slug, introModule.index);
  }, [introModule.index]);

  useEffect(() => {
    return () => {
      if (saveTimer.current != null) {
        window.clearTimeout(saveTimer.current);
      }
    };
  }, []);

  function seek(next: number) {
    setSeconds(next);
    if (saveTimer.current != null) {
      window.clearTimeout(saveTimer.current);
    }
    saveTimer.current = window.setTimeout(() => {
      void savePlayerSeconds(dptcCourse.slug, next);
    }, 1500);
  }

  return (
    <div className="grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div>
        <SimulatedVideo
          poster={dptcCourse.playerPoster}
          duration={introDurationSeconds}
          current={seconds}
          onSeek={seek}
        />
        <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {introModule.title}
          </h1>
          <a
            href={dptcCourse.hero}
            download
            className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-950"
          >
            <Download className="size-4" />
            Download as PDF
          </a>
        </div>
        <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-neutral-500">
          {dptcCourse.description} This opening session maps the 13 modules,
          the 70% pass mark for the certificate-qualifying assessment, and how
          screening, treatment, and rights-based practice fit together.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="flex items-center gap-3 rounded-2xl bg-white px-4 py-4 shadow-sm"
            >
              <fact.icon className="size-4 text-neutral-400" />
              <div>
                <p className="text-[11px] tracking-wide text-neutral-400 uppercase">
                  {fact.label}
                </p>
                <p className="text-sm font-semibold">{fact.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <PlayerRail
        highlights={[...introHighlights]}
        activeSeconds={seconds}
        onHighlight={seek}
        quizHref={`/learn/${courseSlug}/quiz`}
        nextHref={nav.nextHref}
        nextLabel="Next lesson"
        previousLabel="Previous"
        nextPrimary
      />
    </div>
  );
}
