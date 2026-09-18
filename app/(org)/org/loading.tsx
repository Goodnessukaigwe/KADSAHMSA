import {
  DataTableSkeleton,
  LoadingStatus,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "@/components/skeletons";

export default function OrgLoading() {
  return (
    <LoadingStatus>
      <div className="pb-16">
        <PageHeaderSkeleton />
        <StatGridSkeleton className="mt-8" count={3} />
        <DataTableSkeleton className="mt-10" rows={6} cols={4} />
      </div>
    </LoadingStatus>
  );
}
