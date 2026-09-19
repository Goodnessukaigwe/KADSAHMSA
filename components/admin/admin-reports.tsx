import { OrgReportTable } from "@/components/org/org-report-table";
import type { ReportRow } from "@/lib/org/types";

export function AdminReports({ rows }: { rows: ReportRow[] }) {
  return (
    <div className="pb-16">
      <OrgReportTable
        rows={rows}
        showOrganisation
        showHeading={false}
        filename="kadsamhsa-reports.csv"
      />
    </div>
  );
}
