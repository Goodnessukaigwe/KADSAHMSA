"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ListFilter } from "lucide-react";

import type { PublicQuizQuestion } from "@/lib/content/dptc";
import { DEFAULT_PASS_MARK } from "@/lib/domain";
import {
  defaultQuizState,
  getQuizState,
  saveQuizState,
  type QuizAttemptState,
} from "@/lib/learner-session";
import { startAttempt, submitAttempt } from "@/lib/quiz/actions";
import { cn } from "@/lib/utils";

const letters = ["A", "B", "C", "D", "E", "F"] as const;

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function ModuleQuiz({
  courseSlug,
  quizSlug,
  questions,
  title,
  seconds,
  maxAttempts,
  attemptsUsed,
}: {
  courseSlug: string;
  quizSlug: string;
  questions: PublicQuizQuestion[];
  title: string;
  seconds: number;
  maxAttempts: number;
  attemptsUsed: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<QuizAttemptState | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [used, setUsed] = useState(attemptsUsed);
  const submitting = useRef(false);

  useEffect(() => {
    const stored = getQuizState(courseSlug, quizSlug);
    setState(stored ?? defaultQuizState(questions.length, seconds));
    void startAttempt(courseSlug, quizSlug).then((result) => {
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUsed(result.attemptsUsed);
    });
  }, [courseSlug, quizSlug, questions.length, seconds]);

  const submitted = state?.submitted ?? false;

  useEffect(() => {
    if (submitted) return;
    const id = window.setInterval(() => {
      setState((current) => {
        if (!current || current.submitted) return current;
        const remaining = Math.max(0, current.remaining - 1);
        const next = { ...current, remaining };
        if (remaining === 0) {
          void finish(next);
          return next;
        }
        saveQuizState(next, courseSlug, quizSlug);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // finish is stable enough via ref; we only care about submitted/quizSlug
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, courseSlug, quizSlug]);

  function update(next: QuizAttemptState) {
    saveQuizState(next, courseSlug, quizSlug);
    setState(next);
  }

  async function finish(current: QuizAttemptState) {
    if (submitting.current || current.submitted) return;
    submitting.current = true;
    setPending(true);
    setError(null);
    const result = await submitAttempt(courseSlug, quizSlug, current.answers);
    setPending(false);
    submitting.current = false;
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUsed(result.attemptsUsed);
    update({
      ...current,
      submitted: true,
      score: result.score,
      attemptsUsed: result.attemptsUsed,
      correctIndexes: result.correctIndexes,
      verificationId: result.verificationId,
    });
  }

  if (!state) return <div className="min-h-[40vh]" />;

  const question = questions[state.index];
  const selected = state.answers[state.index];
  const passed = state.score != null && state.score >= DEFAULT_PASS_MARK;
  const showModal = Boolean(state.submitted && state.score != null && !reviewing);
  const attemptsLeft = Math.max(0, maxAttempts - used);

  return (
    <div className="relative grid min-w-0 gap-8 overflow-x-clip pb-16 lg:grid-cols-[minmax(0,1fr)_240px]">
      {showModal ? (
        <QuizResultModal
          score={state.score!}
          attemptsLeft={attemptsLeft}
          maxAttempts={maxAttempts}
          quizSlug={quizSlug}
          courseSlug={courseSlug}
          verificationId={state.verificationId}
          onReview={() => {
            if (passed && quizSlug === "module-1") {
              router.push(`/learn/${courseSlug}`);
              return;
            }
            if (passed && quizSlug === "final") {
              router.push("/certificates");
              return;
            }
            setReviewing(true);
          }}
          onContinue={() => {
            if (passed && quizSlug === "module-1") {
              router.push(`/learn/${courseSlug}/lessons/drug-use-nigeria`);
              return;
            }
            if (passed && quizSlug === "final") {
              router.push("/certificates");
              return;
            }
            if (attemptsLeft <= 0) {
              router.push("/quiz");
              return;
            }
            setReviewing(false);
            submitting.current = false;
            update({
              ...defaultQuizState(questions.length, seconds),
              attemptsUsed: used,
            });
            void startAttempt(courseSlug, quizSlug);
          }}
        />
      ) : null}

      <div>
        <div className="flex flex-col gap-1 text-sm text-neutral-400 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 break-words">{reviewing ? "Review answers" : title}</p>
          <p className="shrink-0">
            Question {state.index + 1} of {questions.length}
          </p>
        </div>
        <div className="mt-3 flex gap-1.5">
          {questions.map((item, index) => (
            <span
              key={item.id}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                index <= state.index ? "bg-neutral-950" : "bg-neutral-200"
              )}
            />
          ))}
        </div>

        {error ? (
          <p className="mt-6 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <h1 className="mt-10 max-w-3xl text-xl leading-snug font-bold tracking-tight break-words sm:text-3xl">
          {question.prompt}
        </h1>

        <div className="mt-8 space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selected === index;
            const correctIndex = state.correctIndexes?.[state.index];
            const isCorrect = reviewing && correctIndex === index;
            const showWrong = reviewing && isSelected && !isCorrect;
            const showRight = reviewing && isCorrect;
            return (
              <button
                key={option}
                type="button"
                disabled={reviewing || pending}
                onClick={() => {
                  const nextAnswers = [...state.answers];
                  nextAnswers[state.index] = index;
                  update({ ...state, answers: nextAnswers });
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
            disabled={state.index === 0 || pending}
            onClick={() => update({ ...state, index: Math.max(0, state.index - 1) })}
            className="h-12 rounded-full bg-neutral-200 px-2 text-[10px] font-bold tracking-[0.08em] text-neutral-700 uppercase disabled:text-neutral-400 sm:text-[11px] sm:tracking-[0.14em]"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (state.index + 1 >= questions.length) {
                if (reviewing) {
                  setReviewing(false);
                  return;
                }
                if (!state.submitted) {
                  void finish(state);
                }
                return;
              }
              update({ ...state, index: state.index + 1 });
            }}
            className="h-12 rounded-full bg-neutral-950 px-2 text-[10px] font-bold tracking-[0.08em] text-white uppercase disabled:opacity-60 sm:text-[11px] sm:tracking-[0.14em]"
          >
            {pending
              ? "Scoring…"
              : reviewing && state.index + 1 >= questions.length
                ? "Result"
                : "Next"}
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
            {questions.map((item, index) => {
              const answer = state.answers[index];
              const correctIndex = state.correctIndexes?.[index];
              const wrong =
                reviewing && answer != null && correctIndex != null && answer !== correctIndex;
              const right = reviewing && correctIndex != null && answer === correctIndex;
              return (
                <button
                  key={item.id}
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

function QuizResultModal({
  score,
  attemptsLeft,
  maxAttempts,
  quizSlug,
  courseSlug,
  verificationId,
  onReview,
  onContinue,
}: {
  score: number;
  attemptsLeft: number;
  maxAttempts: number;
  quizSlug: string;
  courseSlug: string;
  verificationId?: string;
  onReview: () => void;
  onContinue: () => void;
}) {
  const passed = score >= DEFAULT_PASS_MARK;
  const isFinal = quizSlug === "final";
  const isDptc = courseSlug === "dptc";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="quiz-result-title"
        className={cn(
          "w-full max-w-lg rounded-[28px] bg-white p-5 shadow-2xl sm:p-8",
          passed ? "ring-2 ring-emerald-400/70" : ""
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold tracking-[0.12em] text-neutral-400 uppercase sm:tracking-[0.16em]">
          <p>Result</p>
          <p>
            Attempts left: {attemptsLeft}/{maxAttempts}
          </p>
        </div>
        <p className="mt-6 text-center text-5xl font-bold tracking-tight">
          {score}
          <span className="text-2xl font-semibold text-neutral-400">/100</span>
        </p>
        <div className="mx-auto mt-4 h-2 max-w-sm overflow-hidden rounded-full bg-neutral-200">
          <div
            className={cn("h-full rounded-full", passed ? "bg-emerald-500" : "bg-red-400")}
            style={{ width: `${score}%` }}
          />
        </div>
        <h2 id="quiz-result-title" className="mt-6 text-center text-xl font-bold">
          {passed
            ? isFinal
              ? "You passed the certificate assessment"
              : isDptc
                ? "You passed Module 1"
                : "You passed this quiz"
            : "Below the 70% pass mark"}
        </h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-neutral-500">
          {passed && isFinal && verificationId
            ? `Your certificate ID is ${verificationId}. Download it from Certificates, or check it on the public verify page.`
            : passed && isFinal
              ? "You reached 70%. If every live lesson is complete, your certificate is on the Certificates page."
              : passed
                ? isDptc
                  ? "Continue the remaining DPTC modules. The certificate is issued only after all 13 modules and a pass on the final assessment."
                  : "Continue the remaining lessons. A certificate is issued only after every live lesson and a pass on the final assessment."
                : "Review the questions marked in red, then retry. You have three attempts on this quiz."}
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onReview}
            className="h-12 rounded-full bg-neutral-200 px-3 text-[10px] font-bold tracking-[0.08em] text-neutral-800 uppercase sm:text-[11px] sm:tracking-[0.12em]"
          >
            {passed && isFinal
              ? "Open certificates"
              : passed
                ? "Back to the course"
                : "Review answers"}
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="h-12 rounded-full bg-neutral-950 px-3 text-[10px] font-bold tracking-[0.08em] text-white uppercase sm:text-[11px] sm:tracking-[0.12em]"
          >
            {passed && isFinal
              ? "View certificate"
              : passed
                ? "Next module"
                : attemptsLeft > 0
                  ? "Retake quiz"
                  : "Quiz results"}
          </button>
        </div>
      </div>
    </div>
  );
}
