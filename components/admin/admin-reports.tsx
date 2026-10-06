import { OrgReportTable } from "@/components/org/org-report-table";
import type { ReportRow } from "@/lib/org/types";

export function AdminReports({ rows }: { rows: ReportRow[] }) {
  return (
    <div className="pb-16">
      <section className="mb-8 rounded-[24px] bg-white p-5">
        <h2 className="text-[11px] font-bold tracking-[0.16em] text-neutral-400 uppercase">Download spreadsheets</h2>
        <p className="mt-1 text-sm text-neutral-500">Everything, as a CSV you can open in Excel or Google Sheets.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            ["learners", "Learners and progress"],
            ["quizzes", "Quiz results"],
            ["certificates", "Certificates"],
          ].map(([kind, label]) => (
            <a
              key={kind}
              href={`/api/admin/export?kind=${kind}`}
              className="inline-flex h-10 items-center rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
            >
              {label}
            </a>
          ))}
        </div>
      </section>
      <OrgReportTable
        rows={rows}
        showOrganisation
        showHeading={false}
        filename="kadsamhsa-reports.csv"
      />
    </div>
  );
}
