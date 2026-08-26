"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

type FaqItem = {
  question: string;
  answer: string;
};

export function FaqList({
  items,
  defaultOpen = 1,
  pill = "FAQ",
}: {
  items: readonly FaqItem[];
  defaultOpen?: number;
  pill?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl bg-white p-2 shadow-[0_12px_40px_rgba(0,0,0,0.06)] sm:p-3">
      <div className="mb-2 flex justify-center">
        <span className="rounded-full bg-neutral-950 px-3 py-1 text-[10px] font-semibold tracking-[0.18em] text-white uppercase">
          {pill}
        </span>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => {
          const isOpen = open === index;
          const n = String(index + 1).padStart(2, "0");
          return (
            <div
              key={item.question}
              className={cn(
                "rounded-xl px-3 py-3 sm:px-4",
                isOpen ? "bg-[#2c2c2c] text-white" : "bg-neutral-50 text-neutral-950"
              )}
            >
              <button
                type="button"
                className="flex w-full items-center gap-3 text-left"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : index)}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold",
                    isOpen ? "bg-white/10 text-white" : "bg-white text-neutral-500 shadow-sm"
                  )}
                >
                  {n}
                </span>
                <span className="flex-1 text-sm font-semibold sm:text-[15px]">
                  {item.question}
                </span>
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md",
                    isOpen ? "bg-white/10 text-white" : "bg-white text-neutral-950 shadow-sm"
                  )}
                >
                  {isOpen ? (
                    <Minus className="size-3.5" />
                  ) : (
                    <Plus className="size-3.5" />
                  )}
                </span>
              </button>
              {isOpen ? (
                <p className="mt-3 pr-10 pl-11 text-sm leading-relaxed text-white/80">
                  {item.answer}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
