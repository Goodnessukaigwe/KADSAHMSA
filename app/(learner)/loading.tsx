import {
  CourseGridSkeleton,
  LoadingStatus,
  PageHeaderSkeleton,
} from "@/components/skeletons";

export default function LearnerLoading() {
  return (
    <LoadingStatus>
      <div className="pb-10">
        <PageHeaderSkeleton />
        <CourseGridSkeleton className="mt-8" count={6} />
      </div>
    </LoadingStatus>
  );
}
