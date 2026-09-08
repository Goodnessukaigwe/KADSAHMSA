"use client";

import { useMemo, useState } from "react";

import { certLabel, outcome, progressLabel } from "@/components/org/org-members-table";
import { downloadCsv, toCsv } from "@/lib/org/csv";
import type { ReportRow } from "@/lib/org/types";

export function OrgReportTable({
  rows,
  showOrganisation = false,
  filename,
}: {
  rows: ReportRow[];
  showOrganisation?: boolean;
  filename: string;
}) {
  const [course, setCourse] = useState("all");
  const courses = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of rows) {
      if (row.courseSlug) map.set(row.courseSlug, row.courseTitle);
    }
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [rows]);

  const visible = useMemo(
    () => (course === "all" ? rows : rows.filter((row) => row.courseSlug === course)),
    [rows, course]
  );

  function exportCsv() {
    const headers = [
      "name",
      "email",
      ...(showOrganisation ? ["organisation"] : []),
      "course",
      "enrolled",
      "progress",
      "lessons_completed",
      "lessons_total",
      "quiz",
      "certificate",
    ];
    const body = visible.map((row) => [
      row.name,
      row.email,
      ...(showOrganisation ? [row.organisationName] : []),
      row.courseTitle,
      row.enrolledAt,
      progressLabel(row.completed, row.total),
      String(row.completed),
      String(row.total),
      outcome(row.quizResult),
      certLabel(row.certificate),
    ]);
    downloadCsv(filename, toCsv(headers, body));
  }

  return (
    <section className="overflow-hidden rounded-[24px] bg-white">
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="text-lg font-bold">Reports</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Enrolments, progress, quiz attempts, and certificates. Revenue is not included.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Course
            <select
              value={course}
              onChange={(event) => setCourse(event.target.value)}
              className="ml-2 h-10 rounded-full border border-neutral-200 bg-white px-3 text-[11px] font-bold tracking-[0.08em] text-neutral-950"
            >
              <option value="all">All courses</option>
              {courses.map(([slug, title]) => (
                <option key={slug} value={slug}>
                  {title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={exportCsv}
            disabled={visible.length === 0}
            className="h-10 rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-50"
          >
            Export CSV
          </button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              <th className="px-5 py-3 font-bold">Name</th>
              <th className="px-2 py-3 font-bold">Email</th>
              {showOrganisation ? (
                <th className="px-2 py-3 font-bold">Organisation</th>
              ) : null}
              <th className="px-2 py-3 font-bold">Course</th>
              <th className="px-2 py-3 font-bold">Enrolled</th>
              <th className="px-2 py-3 font-bold">Progress</th>
              <th className="px-2 py-3 font-bold">Quiz</th>
              <th className="px-5 py-3 font-bold">Certificate</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td
                  colSpan={showOrganisation ? 8 : 7}
                  className="px-5 py-10 text-sm text-neutral-400"
                >
                  No enrolments in this view.
                </td>
              </tr>
            ) : (
              visible.map((row, index) => (
                <tr
                  key={`${row.userId}-${row.courseSlug}-${index}`}
                  className="border-b border-neutral-100 last:border-0"
                >
                  <td className="px-5 py-4 font-medium">{row.name}</td>
                  <td className="px-2 py-4 text-neutral-500">{row.email || "—"}</td>
                  {showOrganisation ? (
                    <td className="px-2 py-4 text-neutral-500">{row.organisationName}</td>
                  ) : null}
                  <td className="px-2 py-4">{row.courseTitle}</td>
                  <td className="px-2 py-4 text-neutral-500">{row.enrolledAt}</td>
                  <td className="px-2 py-4 text-neutral-500">
                    {progressLabel(row.completed, row.total)}
                  </td>
                  <td className="px-2 py-4">{outcome(row.quizResult)}</td>
                  <td className="px-5 py-4">{certLabel(row.certificate)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
