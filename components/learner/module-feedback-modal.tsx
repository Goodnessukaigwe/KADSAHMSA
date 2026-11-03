"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { submitModuleFeedback } from "@/lib/feedback/module-feedback-actions";
import { cn } from "@/lib/utils";

/**
 * Shown when a learner finishes a module. One tap and an optional note, then they carry on.
 * "Nil" is a fine answer. These answers are also needed before the certificate download.
 */
export function ModuleFeedbackModal({
  courseSlug,
  moduleIndex,
  onDone,
}: {
  courseSlug: string;
  moduleIndex: number;
  onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!rating) {
      setError("Tap a star to rate this module.");
      return;
    }
    setPending(true);
    setError(null);
    const result = await submitModuleFeedback({
      courseSlug,
      moduleIndex,
      rating,
      comment,
      pagePath: window.location.pathname,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="module-feedback-title"
    >
      <form onSubmit={submit} className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-xl">
        <h2 id="module-feedback-title" className="text-xl font-bold">
          How was this module?
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          Your answer helps us fix problems early. It takes a few seconds.
        </p>
        <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              className="rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
            >
              <Star
                className={cn("size-9", n <= rating ? "fill-amber-400 text-amber-400" : "text-neutral-300")}
              />
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm font-semibold">
          Anything confusing or not working?
          <input
            type="text"
            maxLength={1000}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Type nil if nothing"
            className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm font-normal outline-none focus:border-neutral-950"
          />
        </label>
        {error ? (
          <p className="mt-3 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-5 h-12 w-full rounded-full bg-neutral-950 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
