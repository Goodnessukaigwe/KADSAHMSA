import {
  CourseGridSkeleton,
  LoadingStatus,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyCoursesLoading() {
  return (
    <LoadingStatus>
      <div className="pb-12">
        <PageHeaderSkeleton />
        <StatGridSkeleton className="mt-8" />
        <div className="mt-8 flex gap-2">
          <Skeleton className="h-11 w-16" />
          <Skeleton className="h-11 w-28" />
          <Skeleton className="h-11 w-28" />
        </div>
        <CourseGridSkeleton className="mt-8" count={3} />
      </div>
    </LoadingStatus>
  );
}
