import { DataTableSkeleton, LoadingStatus } from "@/components/skeletons";

export default function AdminReportsLoading() {
  return (
    <LoadingStatus>
      <div className="pb-16">
        <DataTableSkeleton rows={8} cols={6} />
      </div>
    </LoadingStatus>
  );
}
