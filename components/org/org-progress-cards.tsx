import { summarizeOrgProgress, type OrgProgressRow } from "@/lib/org/progress";

export function OrgProgressCards({ rows }: { rows: OrgProgressRow[] }) {
  const summary = summarizeOrgProgress(rows);
  const stats = [
    [`${summary.lessonCompletionRate}%`, "Lesson completion"],
    [`${summary.finalPassRate}%`, "Final pass rate"],
    [summary.averageScore == null ? "—" : `${summary.averageScore}%`, "Average score"],
    [`${summary.certificateRate}%`, "Certificates"],
  ] as const;

  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map(([value, label]) => (
        <div key={label} className="rounded-2xl bg-white px-5 py-4">
          <p className="text-2xl font-bold">
            {value}{" "}
            <span className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              {label}
            </span>
          </p>
        </div>
      ))}
    </div>
  );
}
