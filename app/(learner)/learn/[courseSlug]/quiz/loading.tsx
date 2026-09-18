import { LoadingStatus, QuizQuestionSkeleton } from "@/components/skeletons";

export default function ModuleQuizLoading() {
  return (
    <LoadingStatus>
      <QuizQuestionSkeleton />
    </LoadingStatus>
  );
}
