import { LessonPlayerSkeleton, LoadingStatus } from "@/components/skeletons";

export default function CoursePlayLoading() {
  return (
    <LoadingStatus>
      <LessonPlayerSkeleton />
    </LoadingStatus>
  );
}
