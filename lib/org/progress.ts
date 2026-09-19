export function progressPercent(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((completed / total) * 100));
}

export type OrgProgressRow = {
  courseSlug: string;
  completed: number;
  total: number;
  quizResult: "pass" | "fail" | "none";
  quizScore: number | null;
  certificate: "issued" | "revoked" | "none";
};

export type OrgProgressSummary = {
  enrolments: number;
  lessonCompletionRate: number;
  finalPassRate: number;
  averageScore: number | null;
  certificateRate: number;
};

export function summarizeOrgProgress(rows: OrgProgressRow[]): OrgProgressSummary {
  const enrolled = rows.filter((row) => row.courseSlug !== "");
  const enrolments = enrolled.length;
  if (enrolments === 0) {
    return {
      enrolments: 0,
      lessonCompletionRate: 0,
      finalPassRate: 0,
      averageScore: null,
      certificateRate: 0,
    };
  }

  const lessonsDone = enrolled.filter(
    (row) => row.total > 0 && row.completed >= row.total
  ).length;
  const finalsPassed = enrolled.filter((row) => row.quizResult === "pass").length;
  const scores = enrolled.flatMap((row) =>
    row.quizScore == null ? [] : [row.quizScore]
  );
  const certificates = enrolled.filter((row) => row.certificate === "issued").length;

  return {
    enrolments,
    lessonCompletionRate: Math.round((lessonsDone / enrolments) * 100),
    finalPassRate: Math.round((finalsPassed / enrolments) * 100),
    averageScore: scores.length
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : null,
    certificateRate: Math.round((certificates / enrolments) * 100),
  };
}
