"use client";

import { useState } from "react";
import { Star } from "lucide-react";

import { submitCourseSurvey } from "@/lib/feedback/survey-actions";
import { cn } from "@/lib/utils";

function Stars({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="rounded-md p-1 outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
          >
            <Star
              className={cn(
                "size-7",
                n <= value ? "fill-amber-400 text-amber-400" : "text-neutral-300"
              )}
            />
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const area =
  "mt-2 w-full rounded-xl border border-neutral-200 px-4 py-3 text-sm outline-none focus:border-neutral-950";

export function CertificateSurvey({
  certificateId,
  missingModules = [],
  onDone,
}: {
  certificateId: string;
  missingModules?: number[];
  onDone: () => void;
}) {
  const [overall, setOverall] = useState(0);
  const [easeOfUse, setEaseOfUse] = useState(0);
  const [contentQuality, setContentQuality] = useState(0);
  const [mobileExperience, setMobileExperience] = useState(0);
  const [recommend, setRecommend] = useState<number | null>(null);
  const [enjoyed, setEnjoyed] = useState("");
  const [improve, setImprove] = useState("");
  const [moduleRatings, setModuleRatings] = useState<Record<number, number>>({});
  const [moduleNotes, setModuleNotes] = useState<Record<number, string>>({});
  const [hadProblems, setHadProblems] = useState(false);
  const [problems, setProblems] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!overall || !easeOfUse || !contentQuality || !mobileExperience || recommend === null) {
      setError("Please answer all the rating questions.");
      return;
    }
    if (missingModules.some((index) => !moduleRatings[index])) {
      setError("Please give each module a star rating. Type nil if you have nothing to add.");
      return;
    }
    setError(null);
    setPending(true);
    const result = await submitCourseSurvey({
      certificateId,
      overall,
      easeOfUse,
      contentQuality,
      mobileExperience,
      recommend,
      enjoyed,
      improve,
      hadProblems,
      problems,
      modules: missingModules.map((index) => ({
        index,
        rating: moduleRatings[index],
        comment: moduleNotes[index] ?? "",
      })),
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-6 rounded-[20px] bg-neutral-50 p-5 sm:p-6">
      <div>
        <h3 className="text-lg font-bold">Help us improve the academy</h3>
        <p className="mt-1 text-sm text-neutral-500">
          A minute of your time. Your answers unlock the certificate download and help us make the
          platform better for the next learner.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Stars label="Overall, how was your experience?" value={overall} onChange={setOverall} />
        <Stars label="How easy was the platform to use?" value={easeOfUse} onChange={setEaseOfUse} />
        <Stars label="How good was the course content?" value={contentQuality} onChange={setContentQuality} />
        <Stars label="How well did it work on your phone or device?" value={mobileExperience} onChange={setMobileExperience} />
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">
          How likely are you to recommend this academy to a colleague? (0 = not at all, 10 = very likely)
        </legend>
        <div className="mt-2 flex flex-wrap gap-1.5" role="radiogroup">
          {Array.from({ length: 11 }, (_, n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={recommend === n}
              onClick={() => setRecommend(n)}
              className={cn(
                "size-10 rounded-full border text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-neutral-950",
                recommend === n
                  ? "border-neutral-950 bg-neutral-950 text-white"
                  : "border-neutral-200 bg-white"
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block text-sm font-semibold">
        What worked well?
        <textarea rows={3} maxLength={2000} value={enjoyed} onChange={(e) => setEnjoyed(e.target.value)} className={area} />
      </label>
      <label className="block text-sm font-semibold">
        What should we improve?
        <textarea rows={3} maxLength={2000} value={improve} onChange={(e) => setImprove(e.target.value)} className={area} />
      </label>

      {missingModules.length > 0 ? (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold">Quick feedback on each module</h4>
            <p className="mt-1 text-xs text-neutral-500">
              A star rating for each module, and a note if something confused you or did not work.
              Type nil if you have nothing to add.
            </p>
          </div>
          {missingModules.map((index) => (
            <div key={index} className="rounded-xl bg-white p-4">
              <Stars
                label={`Module ${index}`}
                value={moduleRatings[index] ?? 0}
                onChange={(next) => setModuleRatings((current) => ({ ...current, [index]: next }))}
              />
              <input
                type="text"
                maxLength={1000}
                value={moduleNotes[index] ?? ""}
                onChange={(event) => setModuleNotes((current) => ({ ...current, [index]: event.target.value }))}
                placeholder="Anything confusing or not working? (nil if none)"
                className="mt-3 h-11 w-full rounded-xl border border-neutral-200 px-4 text-sm outline-none focus:border-neutral-950"
              />
            </div>
          ))}
        </div>
      ) : null}

      <div>
        <label className="flex items-center gap-3 text-sm font-semibold">
          <input
            type="checkbox"
            checked={hadProblems}
            onChange={(e) => setHadProblems(e.target.checked)}
            className="size-5"
          />
          I had a problem or something did not work
        </label>
        {hadProblems ? (
          <textarea
            rows={3}
            maxLength={2000}
            value={problems}
            onChange={(e) => setProblems(e.target.value)}
            placeholder="What happened, and on which page?"
            className={area}
          />
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-full bg-neutral-950 px-7 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Sending…" : "Submit and unlock my certificate"}
      </button>
    </form>
  );
}
