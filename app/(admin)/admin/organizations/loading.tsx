import { DataTableSkeleton, LoadingStatus, PageHeaderSkeleton } from "@/components/skeletons";

export default function AdminOrganizationsLoading() {
  return (
    <LoadingStatus>
      <div className="pb-16">
        <PageHeaderSkeleton />
        <DataTableSkeleton className="mt-8" rows={8} cols={5} />
      </div>
    </LoadingStatus>
  );
}
