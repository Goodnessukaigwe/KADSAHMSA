import { DataTableSkeleton, LoadingStatus, PageHeaderSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminCoursesLoading() {
  return (
    <LoadingStatus>
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-start justify-between gap-4">
          <PageHeaderSkeleton />
          <Skeleton className="h-12 w-44 rounded-xl" />
        </div>
        <DataTableSkeleton className="mt-6" rows={8} cols={6} />
      </div>
    </LoadingStatus>
  );
}
