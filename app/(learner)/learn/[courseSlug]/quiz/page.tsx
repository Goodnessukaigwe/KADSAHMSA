import { notFound } from "next/navigation";

import { SplitCta } from "@/components/landing/split-cta";
import { ModuleQuiz } from "@/components/learner/module-quiz";
import { getVisibleCourse } from "@/lib/courses/queries";
import { requireUser } from "@/lib/permissions";
import { countSubmittedAttempts, getPublicQuiz } from "@/lib/quiz/queries";

export const metadata = { title: "Quiz" };

export default async function CourseQuizPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const user = await requireUser();
  const visible = await getVisibleCourse(courseSlug);
  if (!visible) notFound();

  if (courseSlug !== "dptc") {
    return (
      <div className="mx-auto max-w-lg pb-16">
        <h1 className="text-3xl font-bold tracking-tight">No module quiz</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          This course has no mid-course quiz. If staff added a final assessment, it
          opens after you complete every live lesson. Without a final quiz, no
          certificate is issued.
        </p>
        <div className="mt-8">
          <SplitCta href={`/learn/${courseSlug}`} size="sm">
            Back to the course
          </SplitCta>
        </div>
      </div>
    );
  }

  const quiz = await getPublicQuiz(courseSlug, "module-1");
  if (!quiz) {
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

  const attemptsUsed = await countSubmittedAttempts(user.id, quiz.quizId);

  return (
    <ModuleQuiz
      courseSlug={courseSlug}
      quizSlug="module-1"
      questions={quiz.questions}
      title={quiz.title}
      seconds={quiz.seconds}
      maxAttempts={quiz.maxAttempts}
      attemptsUsed={attemptsUsed}
    />
  );
}
