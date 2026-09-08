import { OrgReportTable } from "@/components/org/org-report-table";
import type { ReportRow } from "@/lib/org/types";

export function AdminReports({ rows }: { rows: ReportRow[] }) {
  return (
    <div className="pb-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Reports</h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">
        Enrolments, completions, quizzes, and certificates across all organisations and unattached learners. Revenue waits for Paystack.
      </p>
      <div className="mt-8">
        <OrgReportTable rows={rows} showOrganisation filename="kadsamhsa-reports.csv" />
      </div>
    </div>
  );
}
