import { notFound } from "next/navigation";

import { SplitCta } from "@/components/landing/split-cta";
import { ModuleQuiz } from "@/components/learner/module-quiz";
import { getVisibleCourse } from "@/lib/courses/queries";
import {
  nextHrefAfterModule,
  resolveOutlineModule,
} from "@/lib/learning/progress";
import { requireUser } from "@/lib/permissions";
import { countSubmittedAttempts, getPublicQuiz } from "@/lib/quiz/queries";

export const metadata = { title: "Quiz" };

export default async function CourseQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string }>;
  searchParams: Promise<{ module?: string }>;
}) {
  const { courseSlug } = await params;
  const { module: moduleParam } = await searchParams;
  const user = await requireUser();
  const visible = await getVisibleCourse(courseSlug);
  if (!visible) notFound();

  const module = resolveOutlineModule(visible.outline, moduleParam, courseSlug);
  const isDptcModuleOne = courseSlug === "dptc" && module?.position === 1;
  const hasQuiz = Boolean(module?.hasQuiz || isDptcModuleOne);

  if (!module || !hasQuiz) {
    return (
      <div className="mx-auto max-w-lg pb-16">
        <h1 className="text-3xl font-bold tracking-tight">No module quiz</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          This module has no quiz. Next opens the following module. If staff added a
          final assessment, it opens after you complete every module.
        </p>
        <div className="mt-8">
          <SplitCta href={`/learn/${courseSlug}`} size="sm">
            Back to the course
          </SplitCta>
        </div>
      </div>
    );
  }

  const quizSlug = isDptcModuleOne ? "module-1" : `module-${module.position}`;
  const quiz = await getPublicQuiz(courseSlug, quizSlug);
  if (!quiz) {
    return (
      <div className="mx-auto max-w-lg pb-16">
        <h1 className="text-3xl font-bold tracking-tight">Quiz unavailable</h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500">
          {courseSlug === "dptc"
            ? "Quiz rows are missing. Apply supabase/apply-phase3.sql in the dashboard, then try again."
            : "This module quiz has no questions yet."}
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
  const nextHref = nextHrefAfterModule(
    courseSlug,
    visible.outline,
    module,
    visible.hasFinalQuiz
  );

  return (
    <ModuleQuiz
      courseSlug={courseSlug}
      quizSlug={quizSlug}
      questions={quiz.questions}
      title={quiz.title}
      seconds={quiz.seconds}
      maxAttempts={quiz.maxAttempts}
      attemptsUsed={attemptsUsed}
      nextHref={nextHref}
      moduleIndex={module.position}
    />
  );
}
