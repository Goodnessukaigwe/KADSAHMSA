import { LoadingStatus, QuizQuestionSkeleton } from "@/components/skeletons";

export default function FinalQuizLoading() {
  return (
    <LoadingStatus>
      <QuizQuestionSkeleton />
    </LoadingStatus>
  );
}
