import { LoadingStatus, PageHeaderSkeleton, StatGridSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function LearnCourseLoading() {
  return (
    <LoadingStatus>
      <div className="relative pb-16 lg:pr-[300px]">
        <div className="flex gap-2">
          <Skeleton className="h-7 w-24 rounded-full" />
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-4 aspect-[16/9] w-full rounded-2xl bg-neutral-200" />
        <PageHeaderSkeleton className="mt-6" />
        <StatGridSkeleton className="mt-8" />
        <div className="mt-10 space-y-2">
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
          <Skeleton className="h-16 w-full rounded-2xl" />
        </div>
      </div>
    </LoadingStatus>
  );
}
