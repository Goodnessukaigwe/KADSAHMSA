import {
  LoadingStatus,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function QuizResultsLoading() {
  return (
    <LoadingStatus>
      <div className="pb-16">
        <PageHeaderSkeleton />
        <StatGridSkeleton className="mt-8" />
        <div className="mt-10 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-[24px] bg-white p-5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-6 w-14" />
              <Skeleton className="h-7 w-20 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </LoadingStatus>
  );
}
