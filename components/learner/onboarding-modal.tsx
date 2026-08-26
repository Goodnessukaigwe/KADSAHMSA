"use client";

import { useState } from "react";

import { dashboardCopy } from "@/lib/content/dashboard";
import { completeOnboarding } from "@/lib/learner-session";

type OnboardingModalProps = {
  onDone: () => void;
};

export function OnboardingModal({ onDone }: OnboardingModalProps) {
  const [step, setStep] = useState(0);
  const steps = dashboardCopy.onboarding;
  const current = steps[step];
  const total = steps.length;

  function advance() {
    if (step + 1 >= total) {
      completeOnboarding();
      onDone();
      return;
    }
    setStep((value) => value + 1);
  }

  return (
    <div className="pointer-events-none absolute top-0 right-0 z-20 w-full max-w-[300px]">
      <div
        className="pointer-events-auto rounded-2xl bg-white p-5 shadow-[0_16px_50px_rgba(0,0,0,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="onboarding-title" className="text-[15px] font-bold">{current.title}</h2>
          <p className="text-xs font-semibold text-neutral-400">
            {step + 1}/{total}
          </p>
        </div>
        <div className="mt-3 flex gap-1.5" aria-hidden="true">
          {steps.map((_, index) => (
            <span
              key={index}
              className={
                index <= step
                  ? "h-1.5 flex-1 rounded-full bg-neutral-950"
                  : "h-1.5 flex-1 rounded-full bg-neutral-200"
              }
            />
          ))}
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-neutral-500">
          {current.body}
        </p>
        <button
          type="button"
          onClick={advance}
          className="mt-5 h-11 w-full rounded-full bg-neutral-950 text-[11px] font-bold tracking-[0.16em] text-white uppercase"
        >
          I understand
        </button>
      </div>
    </div>
  );
}
