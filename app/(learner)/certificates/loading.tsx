import { LoadingStatus, PageHeaderSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function CertificatesLoading() {
  return (
    <LoadingStatus>
      <div className="pb-16">
        <PageHeaderSkeleton />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-4 rounded-[24px] bg-white p-5 sm:flex-row sm:items-center"
            >
              <Skeleton className="size-12 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-11 w-36 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </LoadingStatus>
  );
}
