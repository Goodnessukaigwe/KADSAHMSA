import { LessonPlayerSkeleton, LoadingStatus } from "@/components/skeletons";

export default function LessonLoading() {
  return (
    <LoadingStatus>
      <LessonPlayerSkeleton />
    </LoadingStatus>
  );
}
