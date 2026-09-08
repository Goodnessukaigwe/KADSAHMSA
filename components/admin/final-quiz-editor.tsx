"use client";

import { Plus, Trash2 } from "lucide-react";

import type { BuilderQuizQuestion } from "@/lib/courses/types";

const letters = ["A", "B", "C", "D"] as const;

function emptyQuestion(): BuilderQuizQuestion {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: "",
    options: ["", "", "", ""],
    correctIndex: 0,
  };
}

export function FinalQuizEditor({
  questions,
  onChange,
}: {
  questions: BuilderQuizQuestion[];
  onChange: (questions: BuilderQuizQuestion[]) => void;
}) {
  function update(index: number, next: BuilderQuizQuestion) {
    onChange(questions.map((question, i) => (i === index ? next : question)));
  }

  return (
    <section className="mt-8 rounded-[24px] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Final assessment</h2>
          <p className="mt-1 max-w-xl text-sm text-neutral-400">
            Multiple choice only. Pass mark 70%, three attempts. A certificate is issued
            when every live lesson is complete and the learner scores 70% or above.
            Leave this empty if the course has no quiz and no certificate.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([...questions, emptyQuestion()])}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-neutral-100 px-4 text-[11px] font-bold tracking-[0.12em] uppercase"
        >
          <Plus className="size-3.5" />
          Add question
        </button>
      </div>

      {questions.length === 0 ? (
        <p className="mt-6 text-sm text-neutral-400">
          No questions yet. Add at least one, then Save. Without a final quiz this course
          will not issue a certificate.
        </p>
      ) : (
        <ol className="mt-6 space-y-6">
          {questions.map((question, index) => (
            <li key={question.id} className="rounded-2xl border border-neutral-100 p-4">
              <div className="flex items-start justify-between gap-3">
                <label className="min-w-0 flex-1 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                  Question {index + 1}
                  <textarea
                    value={question.prompt}
                    onChange={(event) =>
                      update(index, { ...question, prompt: event.target.value })
                    }
                    rows={2}
                    className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-medium tracking-normal text-neutral-950 outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onChange(questions.filter((_, i) => i !== index))}
                  className="mt-6 flex size-9 items-center justify-center rounded-full text-neutral-400 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Remove question ${index + 1}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {question.options.map((option, optionIndex) => (
                  <label
                    key={letters[optionIndex]}
                    className="flex items-start gap-2 rounded-xl border border-neutral-200 px-3 py-2"
                  >
                    <input
                      type="radio"
                      name={`correct-${question.id}`}
                      checked={question.correctIndex === optionIndex}
                      onChange={() => update(index, { ...question, correctIndex: optionIndex })}
                      className="mt-2"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold tracking-[0.12em] text-neutral-400 uppercase">
                        {letters[optionIndex]} {question.correctIndex === optionIndex ? "· Correct" : ""}
                      </span>
                      <input
                        value={option}
                        onChange={(event) => {
                          const options = [...question.options] as BuilderQuizQuestion["options"];
                          options[optionIndex] = event.target.value;
                          update(index, { ...question, options });
                        }}
                        className="mt-1 h-9 w-full text-sm tracking-normal text-neutral-950 outline-none"
                      />
                    </span>
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
