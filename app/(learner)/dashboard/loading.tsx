import {
  CourseGridSkeleton,
  LoadingStatus,
  PageHeaderSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function LearnerHomeLoading() {
  return (
    <LoadingStatus>
      <div className="pb-10">
        <PageHeaderSkeleton />
        <div className="mt-8 overflow-hidden rounded-[28px] bg-white lg:grid lg:grid-cols-[1.15fr_0.85fr]">
          <Skeleton className="aspect-[16/10] min-h-[220px] w-full rounded-none bg-neutral-200 lg:min-h-[280px]" />
          <div className="flex flex-col justify-center px-6 py-8 sm:px-8">
            <Skeleton className="h-7 w-3/4" />
            <Skeleton className="mt-3 h-4 w-24" />
            <Skeleton className="mt-6 h-11 w-40 rounded-full" />
          </div>
        </div>
        <CourseGridSkeleton className="mt-12" count={3} />
      </div>
    </LoadingStatus>
  );
}
