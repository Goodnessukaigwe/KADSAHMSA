import { notFound } from "next/navigation";
import Link from "next/link";

import { SplitCta } from "@/components/landing/split-cta";
import { ModuleQuiz } from "@/components/learner/module-quiz";
import { getVisibleCourse, liveLessonCountForSlug } from "@/lib/courses/queries";
import { isCourseComplete } from "@/lib/learning/progress";
import { getMyProgress } from "@/lib/learning/queries";
import { requireUser } from "@/lib/permissions";
import { countSubmittedAttempts, getPublicQuiz } from "@/lib/quiz/queries";

export const metadata = { title: "Final assessment" };

export default async function FinalQuizPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const user = await requireUser();
  const [course, progress, liveCount] = await Promise.all([
    getVisibleCourse(courseSlug),
    getMyProgress(courseSlug),
    liveLessonCountForSlug(courseSlug),
  ]);
  if (!course) notFound();

  const quiz = await getPublicQuiz(courseSlug, "final");
  const title = course?.title ?? "this course";

  if (!quiz) {
    if (courseSlug === "dptc") {
      return (
        <div className="mx-auto max-w-lg pb-16">
          <h1 className="text-3xl font-bold tracking-tight">Quiz unavailable</h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-500">
            Quiz rows are missing. Apply supabase/apply-phase3.sql in the dashboard,
            then try again.
          </p>
          <div className="mt-8">
            <SplitCta href={`/learn/${courseSlug}`} size="sm">
              Back to the course
            </SplitCta>
          </div>
        </div>
      );
    }
    return (
      <div className="mx-auto max-w-lg pb-16">
        <h1 className="text-3xl font-bold tracking-tight">No final assessment</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          {title} has no final quiz, so no certificate is issued. Complete the live
          lessons from the course page. Staff can add a multiple-choice final in the
          course builder.
        </p>
        <div className="mt-8">
          <SplitCta href={`/learn/${courseSlug}`} size="sm">
            Back to the course
          </SplitCta>
        </div>
      </div>
    );
  }

  if (!isCourseComplete(courseSlug, progress, liveCount)) {
    return (
      <div className="mx-auto max-w-lg pb-16">
        <h1 className="text-3xl font-bold tracking-tight">Final assessment locked</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          The certificate assessment opens after you complete every live lesson.
          The pass mark is 70%. You have three attempts.
        </p>
        <div className="mt-8">
          <SplitCta href={`/learn/${courseSlug}`} size="sm">
            Continue the course
          </SplitCta>
        </div>
        <p className="mt-6 text-sm text-neutral-400">
          Already finished the lessons on another device?{" "}
          <Link href="/my/courses" className="font-semibold text-neutral-700 underline">
            Check My courses
          </Link>
          .
        </p>
      </div>
    );
  }

  const attemptsUsed = await countSubmittedAttempts(user.id, quiz.quizId);

  return (
    <ModuleQuiz
      courseSlug={courseSlug}
      quizSlug="final"
      questions={quiz.questions}
      title={quiz.title}
      seconds={quiz.seconds}
      maxAttempts={quiz.maxAttempts}
      attemptsUsed={attemptsUsed}
    />
  );
}
