import Link from "next/link";

import { SplitCta } from "@/components/landing/split-cta";

export const metadata = { title: "Quizzes" };

export default function QuizPage() {
  return (
    <div className="max-w-xl py-4">
      <p className="text-sm text-neutral-400">Assessments</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Quizzes</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-neutral-500">
        Module quizzes unlock as you move through DPTC. Pass the final
        assessment at 70% or above to qualify for a verifiable certificate.
      </p>
      <div className="mt-8">
        <SplitCta href="/my" size="sm">
          Back to homepage
        </SplitCta>
      </div>
      <p className="mt-6 text-sm text-neutral-400">
        Prefer the full catalogue?{" "}
        <Link href="/courses" className="font-semibold text-neutral-950 underline">
          Browse courses
        </Link>
      </p>
    </div>
  );
}
