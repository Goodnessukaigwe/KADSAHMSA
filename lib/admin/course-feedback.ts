import "server-only";

import { listUserEmails } from "@/lib/auth/admin-users";
import { createAdminClient } from "@/lib/supabase/admin";

export type SurveyRow = {
  createdAt: string;
  learnerName: string;
  learnerEmail: string;
  course: string;
  overall: number;
  easeOfUse: number;
  contentQuality: number;
  mobileExperience: number;
  recommend: number;
  enjoyed: string;
  improve: string;
  hadProblems: boolean;
  problems: string;
};

export type SurveySummary = {
  course: string;
  responses: number;
  overall: number;
  easeOfUse: number;
  contentQuality: number;
  mobileExperience: number;
  /** Net promoter score: % promoters (9-10) minus % detractors (0-6). */
  nps: number;
  withProblems: number;
};

export async function listCourseFeedback() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("course_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return { rows: [] as SurveyRow[], summary: [] as SurveySummary[], ready: false };

  const [{ data: profiles }, { data: courses }, emails] = await Promise.all([
    admin.from("profiles").select("id, full_name"),
    admin.from("courses").select("id, title"),
    listUserEmails(admin),
  ]);
  const nameOf = new Map((profiles ?? []).map((row) => [row.id, row.full_name.trim()]));
  const courseOf = new Map((courses ?? []).map((row) => [row.id, row.title]));

  const rows: SurveyRow[] = (data ?? []).map((row) => ({
    createdAt: row.created_at,
    learnerName: nameOf.get(row.user_id) ?? "",
    learnerEmail: emails.get(row.user_id) ?? "",
    course: courseOf.get(row.course_id) ?? "",
    overall: row.overall,
    easeOfUse: row.ease_of_use,
    contentQuality: row.content_quality,
    mobileExperience: row.mobile_experience,
    recommend: row.recommend,
    enjoyed: row.enjoyed,
    improve: row.improve,
    hadProblems: row.had_problems,
    problems: row.problems,
  }));

  const groups = new Map<string, SurveyRow[]>();
  for (const row of rows) groups.set(row.course, [...(groups.get(row.course) ?? []), row]);
  const avg = (list: SurveyRow[], pick: (row: SurveyRow) => number) =>
    list.reduce((sum, row) => sum + pick(row), 0) / list.length;

  const summary: SurveySummary[] = [...groups.entries()].map(([course, list]) => {
    const promoters = list.filter((row) => row.recommend >= 9).length;
    const detractors = list.filter((row) => row.recommend <= 6).length;
    return {
      course,
      responses: list.length,
      overall: avg(list, (row) => row.overall),
      easeOfUse: avg(list, (row) => row.easeOfUse),
      contentQuality: avg(list, (row) => row.contentQuality),
      mobileExperience: avg(list, (row) => row.mobileExperience),
      nps: Math.round(((promoters - detractors) / list.length) * 100),
      withProblems: list.filter((row) => row.hadProblems).length,
    };
  });
  return { rows, summary, ready: true };
}
