"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookPen } from "lucide-react";

import { loadNote, saveNote } from "@/lib/learning/notes";
import { cn } from "@/lib/utils";

type Status = "idle" | "saving" | "saved" | "error";

/** A private notepad for one lesson page. Saves by itself; hides if notes are not set up. */
export function LessonNotes({
  courseSlug,
  lessonSlug,
  prompted = false,
}: {
  courseSlug: string;
  lessonSlug: string;
  /** The page asks the learner to write something, so open the notepad. */
  prompted?: boolean;
}) {
  const [available, setAvailable] = useState(true);
  const [body, setBody] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(prompted);
  const [status, setStatus] = useState<Status>("idle");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadNote(courseSlug, lessonSlug).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        if (result.unavailable) setAvailable(false);
        return;
      }
      setBody(result.body);
      setLoaded(true);
      if (result.body) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [courseSlug, lessonSlug]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function change(value: string) {
    setBody(value);
    setStatus("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const result = await saveNote(courseSlug, lessonSlug, value);
      if (result.ok) setStatus("saved");
      else {
        setStatus("error");
        if (result.unavailable) setAvailable(false);
      }
    }, 900);
  }

  if (!available) return null;

  return (
    <section className="mt-10 max-w-3xl rounded-2xl border border-neutral-200 bg-neutral-50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        <NotebookPen className="size-4 text-[var(--accent)]" />
        <span className="text-sm font-semibold text-neutral-950">My notes</span>
        <span className="text-xs text-neutral-400">Private to you</span>
        <span className="ml-auto text-xs font-semibold text-neutral-500">
          {open ? "Hide" : body ? "Show" : "Write a note"}
        </span>
      </button>
      {open ? (
        <div className="px-4 pb-4">
          <textarea
            value={body}
            disabled={!loaded}
            maxLength={10000}
            onChange={(event) => change(event.target.value)}
            placeholder="Write your answers and thoughts here. They save automatically."
            aria-label="My notes"
            className="min-h-[140px] w-full resize-y rounded-xl border border-neutral-200 bg-white p-3 text-[15px] leading-relaxed outline-none focus:border-neutral-950"
          />
          <p
            className={cn(
              "mt-1.5 text-xs",
              status === "error" ? "text-red-600" : "text-neutral-400"
            )}
            aria-live="polite"
          >
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : status === "error" ? "Could not save" : ""}
          </p>
        </div>
      ) : null}
    </section>
  );
}
