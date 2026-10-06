"use client";

import { Check, X } from "lucide-react";

import type { LessonCheck } from "@/lib/courses/checks";
import { cn } from "@/lib/utils";

const LETTERS = ["A", "B", "C", "D", "E", "F"] as const;

/** One multiple-choice question inside a lesson. Choosing an option shows the answer straight away. */
export function InlineCheck({
  check,
  number,
  selected,
  large = false,
  onSelect,
}: {
  check: LessonCheck;
  number?: number;
  selected: number | null;
  /** Bigger question text, as on the knowledge-check slides. */
  large?: boolean;
  onSelect: (index: number) => void;
}) {
  const answered = selected !== null;
  const known = check.answer !== null;
  const right = answered && known && selected === check.answer;

  return (
    <div className={cn("rounded-2xl bg-white p-4 sm:p-5", large ? "" : "border border-neutral-200")}>
      <p className={cn("leading-snug font-semibold text-neutral-950", large ? "text-xl sm:text-2xl" : "text-[15px]")}>
        {number ? (
          <span className="mr-2.5 inline-flex size-6 items-center justify-center rounded-md bg-[var(--deep,#0b4d2c)] align-[0.1em] text-xs font-bold text-white">
            {number}
          </span>
        ) : null}
        {check.prompt}
      </p>
      <div className="mt-3 space-y-2" role="radiogroup" aria-label={check.prompt}>
        {check.options.map((option, index) => {
          const chosen = selected === index;
          const isAnswer = answered && known && check.answer === index;
          const wrong = answered && known && chosen && !isAnswer;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={chosen}
              disabled={answered}
              onClick={() => onSelect(index)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm",
                isAnswer
                  ? "border-emerald-600 bg-emerald-50"
                  : wrong
                    ? "border-red-300 bg-red-50"
                    : chosen
                      ? "border-neutral-950 bg-neutral-100"
                      : "border-neutral-200 hover:border-neutral-400",
                answered && !chosen && !isAnswer && "opacity-60"
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  isAnswer
                    ? "bg-emerald-600 text-white"
                    : wrong
                      ? "bg-red-500 text-white"
                      : chosen
                        ? "bg-neutral-950 text-white"
                        : "bg-neutral-100 text-neutral-500"
                )}
              >
                {isAnswer ? <Check className="size-3.5" /> : wrong ? <X className="size-3.5" /> : LETTERS[index]}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </div>
      {answered ? (
        <p
          className={cn(
            "mt-3 text-sm leading-relaxed",
            known ? (right ? "text-emerald-700" : "text-red-700") : "text-neutral-500"
          )}
        >
          {known ? (
            <>
              <strong>{right ? "Correct." : `Not quite. The answer is ${LETTERS[check.answer!]}.`}</strong>
              {check.explanation ? ` ${check.explanation}` : ""}
            </>
          ) : (
            "Answer recorded."
          )}
        </p>
      ) : null}
    </div>
  );
}
