import {
  DataTableSkeleton,
  LoadingStatus,
  PageHeaderSkeleton,
  StatGridSkeleton,
} from "@/components/skeletons";

export default function AdminLoading() {
  return (
    <LoadingStatus>
      <div className="pb-16">
        <PageHeaderSkeleton />
        <StatGridSkeleton className="mt-8" />
        <DataTableSkeleton className="mt-10" rows={5} cols={4} />
      </div>
    </LoadingStatus>
  );
}
