"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListFilter } from "lucide-react";

import { DEFAULT_PASS_MARK } from "@/lib/domain";
import {
  formatClock,
  module1Quiz,
  quizMeta,
} from "@/lib/content/dptc";
import {
  defaultQuizState,
  getQuizState,
  saveQuizState,
  type QuizAttemptState,
} from "@/lib/learner-session";
import { cn } from "@/lib/utils";

const letters = ["A", "B", "C", "D"] as const;

export function ModuleQuiz({ courseSlug }: { courseSlug: string }) {
  const router = useRouter();
  const [state, setState] = useState<QuizAttemptState | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    setState(getQuizState() ?? defaultQuizState(module1Quiz.length, quizMeta.seconds));
  }, []);

  useEffect(() => {
    if (!state || state.submitted) return;
    const id = window.setInterval(() => {
      setState((current) => {
        if (!current || current.submitted) return current;
        const remaining = Math.max(0, current.remaining - 1);
        const next = { ...current, remaining };
        if (remaining === 0) {
          return submitQuiz(next);
        }
        saveQuizState(next);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [state?.submitted]);

  function update(next: QuizAttemptState) {
    saveQuizState(next);
    setState(next);
  }

  if (!state) return <div className="min-h-[40vh]" />;

  const question = module1Quiz[state.index];
  const selected = state.answers[state.index];
  const passed = state.score != null && state.score >= DEFAULT_PASS_MARK;
  const showModal = Boolean(state.submitted && state.score != null && !reviewing);

  return (
    <div className="relative grid gap-8 pb-16 lg:grid-cols-[minmax(0,1fr)_240px]">
      {showModal ? (
        <QuizResultModal
          score={state.score!}
          attemptsLeft={Math.max(0, quizMeta.maxAttempts - state.attemptsUsed)}
          onReview={() => {
            if (passed) {
              router.push(`/learn/${courseSlug}`);
              return;
            }
            setReviewing(true);
          }}
          onContinue={() => {
            if (passed) {
              router.push(`/learn/${courseSlug}/lessons/drug-use-nigeria`);
              return;
            }
            setReviewing(false);
            update({
              ...defaultQuizState(module1Quiz.length, quizMeta.seconds),
              attemptsUsed: state.attemptsUsed,
            });
          }}
        />
      ) : null}

      <div>
        <div className="flex items-center justify-between text-sm text-neutral-400">
          <p>{reviewing ? "Review answers" : quizMeta.title}</p>
          <p>
            Question {state.index + 1} of {module1Quiz.length}
          </p>
        </div>
        <div className="mt-3 flex gap-1.5">
          {module1Quiz.map((_, index) => (
            <span
              key={index}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                index <= state.index ? "bg-neutral-950" : "bg-neutral-200"
              )}
            />
          ))}
        </div>

        <h1 className="mt-10 max-w-3xl text-2xl leading-snug font-bold tracking-tight sm:text-3xl">
          {question.prompt}
        </h1>

        <div className="mt-8 space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selected === index;
            const isCorrect = index === question.correctIndex;
            const showWrong = reviewing && isSelected && !isCorrect;
            const showRight = reviewing && isCorrect;
            return (
              <button
                key={option}
                type="button"
                disabled={reviewing}
                onClick={() => {
                  const answers = [...state.answers];
                  answers[state.index] = index;
                  update({ ...state, answers });
                }}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left",
                  showWrong
                    ? "border-red-300 bg-red-50"
                    : showRight
                      ? "border-neutral-950 bg-neutral-100"
                      : isSelected
                        ? "border-neutral-300 bg-neutral-100"
                        : "border-neutral-200 bg-white hover:border-neutral-300"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                    showWrong
                      ? "bg-red-500 text-white"
                      : showRight || isSelected
                        ? "bg-neutral-950 text-white"
                        : "bg-neutral-100 text-neutral-500"
                  )}
                >
                  {showWrong ? "×" : letters[index]}
                </span>
                <span className="text-sm sm:text-[15px]">{option}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={state.index === 0}
            onClick={() => update({ ...state, index: Math.max(0, state.index - 1) })}
            className="h-12 rounded-full bg-neutral-200 text-[11px] font-bold tracking-[0.14em] text-neutral-700 uppercase disabled:text-neutral-400"
          >
            Previous question
          </button>
          <button
            type="button"
            onClick={() => {
              if (state.index + 1 >= module1Quiz.length) {
                if (reviewing) {
                  setReviewing(false);
                  return;
                }
                if (!state.submitted) {
                  update(submitQuiz(state));
                }
                return;
              }
              update({ ...state, index: state.index + 1 });
            }}
            className="h-12 rounded-full bg-neutral-950 text-[11px] font-bold tracking-[0.14em] text-white uppercase"
          >
            {reviewing && state.index + 1 >= module1Quiz.length
              ? "Back to result"
              : "Next question"}
          </button>
        </div>
      </div>

      <aside className="flex flex-col gap-6 lg:sticky lg:top-24">
        <div className="rounded-[24px] bg-neutral-200 p-4">
          <p className="text-[11px] font-bold tracking-[0.16em] text-neutral-500 uppercase">
            Countdown
          </p>
          <div className="mt-3 rounded-2xl bg-neutral-500 py-6 text-center">
            <p className="text-4xl font-bold tabular-nums text-white">
              {formatClock(state.remaining)}
            </p>
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              All questions
            </p>
            <ListFilter className="size-4 text-neutral-400" />
          </div>
          <div className="mt-3 grid grid-cols-4 gap-2">
            {module1Quiz.map((item, index) => {
              const answer = state.answers[index];
              const wrong = reviewing && answer != null && answer !== item.correctIndex;
              const right = reviewing && answer === item.correctIndex;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => update({ ...state, index })}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-xl text-sm font-semibold",
                    wrong
                      ? "bg-red-100 text-red-600"
                      : right
                        ? "bg-neutral-950 text-white"
                        : index === state.index
                          ? "bg-neutral-300 text-neutral-950"
                          : "bg-neutral-100 text-neutral-500"
                  )}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
        </div>
      </aside>
    </div>
  );
}

function submitQuiz(state: QuizAttemptState): QuizAttemptState {
  const correct = module1Quiz.filter(
    (question, index) => state.answers[index] === question.correctIndex
  ).length;
  const score = Math.round((correct / module1Quiz.length) * 100);
  const next = {
    ...state,
    submitted: true,
    score,
    attemptsUsed: state.attemptsUsed + 1,
  };
  saveQuizState(next);
  return next;
}

function QuizResultModal({
  score,
  attemptsLeft,
  onReview,
  onContinue,
}: {
  score: number;
  attemptsLeft: number;
  onReview: () => void;
  onContinue: () => void;
}) {
  const passed = score >= DEFAULT_PASS_MARK;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-result-title"
        className={cn(
          "w-full max-w-lg rounded-[28px] bg-white p-8 shadow-2xl",
          passed ? "ring-2 ring-emerald-400/70" : ""
        )}
      >
        <div className="flex items-center justify-between text-[11px] font-bold tracking-[0.16em] text-neutral-400 uppercase">
          <p>Result</p>
          <p>
            Attempts left: {attemptsLeft}/{quizMeta.maxAttempts}
          </p>
        </div>
        <p className="mt-6 text-center text-5xl font-bold tracking-tight">
          {score}
          <span className="text-2xl font-semibold text-neutral-400">/100</span>
        </p>
        <div className="mx-auto mt-4 h-2 max-w-sm overflow-hidden rounded-full bg-neutral-200">
          <div
            className={cn(
              "h-full rounded-full",
              passed ? "bg-emerald-500" : "bg-red-400"
            )}
            style={{ width: `${score}%` }}
          />
        </div>
        <h2
          id="quiz-result-title"
          className="mt-6 text-center text-xl font-bold"
        >
          {passed ? "You dey burst my brain!" : "Not quite — but you're close"}
        </h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-neutral-500">
          The pass mark is {DEFAULT_PASS_MARK}%. Consider reviewing Module 6
          (Drug Screening) and Module 9 (Special Populations) as most missed
          questions came from there.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onReview}
            className="h-12 rounded-full bg-neutral-200 text-[11px] font-bold tracking-[0.12em] text-neutral-800 uppercase"
          >
            {passed ? "Review previous modules" : "Review flagged modules"}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="h-12 rounded-full bg-neutral-950 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
          >
            {passed ? "Move on to next module" : "Retake quiz"}
          </button>
        </div>
      </div>
    </div>
  );
}
