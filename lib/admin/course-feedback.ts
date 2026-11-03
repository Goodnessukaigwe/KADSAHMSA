import "server-only";

import { listUserEmails } from "@/lib/auth/admin-users";
import { requireStaff } from "@/lib/permissions";
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

export type ModuleFeedbackRow = {
  createdAt: string;
  learnerName: string;
  learnerEmail: string;
  course: string;
  moduleIndex: number;
  rating: number;
  comment: string;
  pagePath: string;
};

export type ModuleSummary = {
  course: string;
  moduleIndex: number;
  responses: number;
  rating: number;
  withNotes: number;
};

const NIL = /^\s*(nil|none|nothing|n\/a|na|no|-+)?\s*\.?\s*$/i;

/** True for empty answers such as "nil" or "none". */
export function isNilComment(text: string) {
  return NIL.test(text);
}

/** Quick after-module feedback: per-module averages plus the comments (nil answers left out). */
export async function listModuleFeedback() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("module_feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) {
    return { rows: [] as ModuleFeedbackRow[], summary: [] as ModuleSummary[], ready: false };
  }

  const [{ data: profiles }, { data: courses }, emails] = await Promise.all([
    admin.from("profiles").select("id, full_name"),
    admin.from("courses").select("id, title"),
    listUserEmails(admin),
  ]);
  const nameOf = new Map((profiles ?? []).map((row) => [row.id, row.full_name.trim()]));
  const courseOf = new Map((courses ?? []).map((row) => [row.id, row.title]));

  const rows: ModuleFeedbackRow[] = (data ?? []).map((row) => ({
    createdAt: row.created_at,
    learnerName: nameOf.get(row.user_id) ?? "",
    learnerEmail: emails.get(row.user_id) ?? "",
    course: courseOf.get(row.course_id) ?? "",
    moduleIndex: row.module_index,
    rating: row.rating,
    comment: row.comment,
    pagePath: row.page_path,
  }));

  const groups = new Map<string, ModuleFeedbackRow[]>();
  for (const row of rows) {
    const key = `${row.course}\u0000${row.moduleIndex}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const summary: ModuleSummary[] = [...groups.values()]
    .map((list) => ({
      course: list[0].course,
      moduleIndex: list[0].moduleIndex,
      responses: list.length,
      rating: list.reduce((sum, row) => sum + row.rating, 0) / list.length,
      withNotes: list.filter((row) => !NIL.test(row.comment)).length,
    }))
    .sort((a, b) => a.course.localeCompare(b.course) || a.moduleIndex - b.moduleIndex);
  return { rows, summary, ready: true };
}

export type UserFeedback = {
  surveys: {
    course: string;
    createdAt: string;
    overall: number;
    easeOfUse: number;
    contentQuality: number;
    mobileExperience: number;
    recommend: number;
    enjoyed: string;
    improve: string;
    hadProblems: boolean;
    problems: string;
  }[];
  modules: {
    course: string;
    moduleIndex: number;
    rating: number;
    comment: string;
    pagePath: string;
    createdAt: string;
  }[];
};

/** Everything one learner has said: their course surveys and module feedback (staff pages only). */
export async function getFeedbackForUser(userId: string): Promise<UserFeedback> {
  await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return { surveys: [], modules: [] };
  const admin = createAdminClient();
  const [surveyRes, moduleRes, { data: courses }] = await Promise.all([
    admin.from("course_feedback").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    admin
      .from("module_feedback")
      .select("*")
      .eq("user_id", userId)
      .order("course_id")
      .order("module_index", { ascending: true }),
    admin.from("courses").select("id, title"),
  ]);
  const courseOf = new Map((courses ?? []).map((row) => [row.id, row.title]));
  return {
    surveys: (surveyRes.data ?? []).map((row) => ({
      course: courseOf.get(row.course_id) ?? "",
      createdAt: row.created_at,
      overall: row.overall,
      easeOfUse: row.ease_of_use,
      contentQuality: row.content_quality,
      mobileExperience: row.mobile_experience,
      recommend: row.recommend,
      enjoyed: row.enjoyed,
      improve: row.improve,
      hadProblems: row.had_problems,
      problems: row.problems,
    })),
    modules: (moduleRes.data ?? []).map((row) => ({
      course: courseOf.get(row.course_id) ?? "",
      moduleIndex: row.module_index,
      rating: row.rating,
      comment: row.comment,
      pagePath: row.page_path,
      createdAt: row.created_at,
    })),
  };
}
