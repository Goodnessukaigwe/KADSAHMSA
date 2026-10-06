import "server-only";

import { listUserEmails } from "@/lib/auth/admin-users";
import { countChatsNeedingReply } from "@/lib/help/actions";
import { requireStaff } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

const DAY = 24 * 60 * 60 * 1000;

export type DayCount = { date: string; count: number };

export type CourseSummary = {
  slug: string;
  title: string;
  status: string;
  enrolled: number;
  completed: number;
  completionPercent: number;
  certificates: number;
};

export type Overview = {
  learners: number;
  newLearners7d: number;
  activeEnrolments: number;
  newEnrolments7d: number;
  completionRate: number;
  certificates: number;
  attempts30d: number;
  passRate: number;
  averageScore: number;
  signups: DayCount[];
  enrolmentsPerDay: DayCount[];
  courses: CourseSummary[];
  chatsWaiting: number;
  unreadTickets: number;
  recentCertificates: { name: string; course: string; score: number; when: string }[];
};

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** Counts per day for the last `days` days, today last, with zero-filled gaps. */
function perDay(isoDates: (string | null)[], days: number): DayCount[] {
  const counts = new Map<string, number>();
  for (const iso of isoDates) {
    if (!iso) continue;
    const key = iso.slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const out: DayCount[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const key = dayKey(new Date(Date.now() - i * DAY));
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

function ago(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

/** Modules that have at least one live lesson, per course. */
async function moduleCounts(admin: ReturnType<typeof createAdminClient>) {
  const { data } = await admin.from("course_lessons").select("course_id, module_id").eq("status", "live");
  const sets = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const set = sets.get(row.course_id) ?? new Set<string>();
    set.add(row.module_id || `lesson-${set.size}`);
    sets.set(row.course_id, set);
  }
  return new Map([...sets].map(([id, set]) => [id, set.size]));
}

export async function getOverview(): Promise<Overview> {
  await requireStaff();
  const admin = createAdminClient();
  const since30 = new Date(Date.now() - 30 * DAY).toISOString();
  const since7 = Date.now() - 7 * DAY;

  const [
    { data: profiles },
    { data: courses },
    { data: enrolments },
    { data: progress },
    { data: certs },
    { data: attempts },
    { count: unreadTickets },
    modules,
    chatsWaiting,
  ] = await Promise.all([
    admin.from("profiles").select("id, full_name, created_at"),
    admin.from("courses").select("id, slug, title, status").order("title"),
    admin.from("enrolments").select("user_id, course_id, created_at").eq("status", "active"),
    admin.from("course_progress").select("user_id, course_id, completed_indexes"),
    admin
      .from("certificates")
      .select("user_id, course_id, score_percent, issued_at")
      .eq("status", "valid")
      .order("issued_at", { ascending: false }),
    admin.from("quiz_attempts").select("score_percent, passed, submitted_at").not("submitted_at", "is", null).gte("submitted_at", since30),
    admin.from("feedback_tickets").select("id", { count: "exact", head: true }).is("read_at", null),
    moduleCounts(admin),
    countChatsNeedingReply(),
  ]);

  const completedBy = new Map<string, number>();
  for (const row of progress ?? []) {
    completedBy.set(`${row.user_id}:${row.course_id}`, new Set(row.completed_indexes ?? []).size);
  }

  const perCourse = new Map<string, { enrolled: number; completed: number; certificates: number }>();
  let completedEnrolments = 0;
  for (const row of enrolments ?? []) {
    const total = modules.get(row.course_id) ?? 0;
    const entry = perCourse.get(row.course_id) ?? { enrolled: 0, completed: 0, certificates: 0 };
    entry.enrolled += 1;
    if (total > 0 && (completedBy.get(`${row.user_id}:${row.course_id}`) ?? 0) >= total) {
      entry.completed += 1;
      completedEnrolments += 1;
    }
    perCourse.set(row.course_id, entry);
  }
  for (const cert of certs ?? []) {
    const entry = perCourse.get(cert.course_id) ?? { enrolled: 0, completed: 0, certificates: 0 };
    entry.certificates += 1;
    perCourse.set(cert.course_id, entry);
  }

  const submitted = attempts ?? [];
  const passed = submitted.filter((row) => row.passed).length;
  const scoreSum = submitted.reduce((sum, row) => sum + (row.score_percent ?? 0), 0);

  const nameById = new Map((profiles ?? []).map((row) => [row.id, row.full_name.trim() || "Learner"]));
  const titleById = new Map((courses ?? []).map((row) => [row.id, row.title]));

  return {
    learners: profiles?.length ?? 0,
    newLearners7d: (profiles ?? []).filter((row) => new Date(row.created_at).getTime() >= since7).length,
    activeEnrolments: enrolments?.length ?? 0,
    newEnrolments7d: (enrolments ?? []).filter((row) => new Date(row.created_at).getTime() >= since7).length,
    completionRate: enrolments?.length ? Math.round((completedEnrolments / enrolments.length) * 100) : 0,
    certificates: certs?.length ?? 0,
    attempts30d: submitted.length,
    passRate: submitted.length ? Math.round((passed / submitted.length) * 100) : 0,
    averageScore: submitted.length ? Math.round(scoreSum / submitted.length) : 0,
    signups: perDay((profiles ?? []).map((row) => row.created_at), 30),
    enrolmentsPerDay: perDay((enrolments ?? []).map((row) => row.created_at), 30),
    courses: (courses ?? []).map((course) => {
      const entry = perCourse.get(course.id) ?? { enrolled: 0, completed: 0, certificates: 0 };
      return {
        slug: course.slug,
        title: course.title,
        status: course.status,
        enrolled: entry.enrolled,
        completed: entry.completed,
        completionPercent: entry.enrolled ? Math.round((entry.completed / entry.enrolled) * 100) : 0,
        certificates: entry.certificates,
      };
    }),
    chatsWaiting,
    unreadTickets: unreadTickets ?? 0,
    recentCertificates: (certs ?? []).slice(0, 6).map((row) => ({
      name: nameById.get(row.user_id) ?? "Learner",
      course: titleById.get(row.course_id) ?? "Course",
      score: row.score_percent,
      when: ago(row.issued_at),
    })),
  };
}

export type CourseAnalytics = {
  slug: string;
  title: string;
  enrolled: number;
  completed: number;
  averageProgress: number;
  certificates: number;
  modules: { position: number; title: string; completed: number; percent: number }[];
  quizzes: { label: string; learners: number; attempts: number; passRate: number; averageScore: number }[];
  stuck: { id: string; name: string; email: string; percent: number; idleDays: number }[];
  learners: { name: string; email: string; percent: number; enrolled: string; lastActive: string }[];
};

export async function getCourseAnalytics(slug: string): Promise<CourseAnalytics | null> {
  await requireStaff();
  const admin = createAdminClient();
  const { data: course } = await admin.from("courses").select("id, slug, title").eq("slug", slug).maybeSingle();
  if (!course) return null;

  const [{ data: enrolments }, { data: progress }, { data: moduleRows }, { data: lessons }, { data: quizzes }, { data: certs }] =
    await Promise.all([
      admin.from("enrolments").select("user_id, created_at").eq("course_id", course.id).eq("status", "active"),
      admin.from("course_progress").select("user_id, completed_indexes, updated_at").eq("course_id", course.id),
      admin.from("course_modules").select("id, position, title").eq("course_id", course.id).order("position"),
      admin.from("course_lessons").select("module_id").eq("course_id", course.id).eq("status", "live"),
      admin.from("quizzes").select("id, slug, kind, module_id").eq("course_id", course.id),
      admin.from("certificates").select("id").eq("course_id", course.id).eq("status", "valid"),
    ]);

  const liveModuleIds = new Set((lessons ?? []).map((row) => row.module_id));
  const modules = (moduleRows ?? []).filter((row) => liveModuleIds.has(row.id));
  const progressBy = new Map((progress ?? []).map((row) => [row.user_id, row]));
  const enrolled = enrolments ?? [];

  const doneCount = (userId: string) => new Set(progressBy.get(userId)?.completed_indexes ?? []).size;
  const percentOf = (userId: string) =>
    modules.length ? Math.min(100, Math.round((doneCount(userId) / modules.length) * 100)) : 0;

  const completed = enrolled.filter((row) => modules.length > 0 && doneCount(row.user_id) >= modules.length).length;
  const averageProgress = enrolled.length
    ? Math.round(enrolled.reduce((sum, row) => sum + percentOf(row.user_id), 0) / enrolled.length)
    : 0;

  const funnel = modules.map((module) => {
    const done = enrolled.filter((row) =>
      (progressBy.get(row.user_id)?.completed_indexes ?? []).includes(module.position)
    ).length;
    return {
      position: module.position,
      title: module.title,
      completed: done,
      percent: enrolled.length ? Math.round((done / enrolled.length) * 100) : 0,
    };
  });

  const quizIds = (quizzes ?? []).map((row) => row.id);
  const { data: attempts } = quizIds.length
    ? await admin
        .from("quiz_attempts")
        .select("quiz_id, user_id, score_percent, passed")
        .in("quiz_id", quizIds)
        .not("submitted_at", "is", null)
    : { data: [] as { quiz_id: string; user_id: string; score_percent: number | null; passed: boolean | null }[] };
  const positionOf = new Map(modules.map((row) => [row.id, row.position]));
  const quizStats = (quizzes ?? [])
    .map((quiz) => {
      const rows = (attempts ?? []).filter((row) => row.quiz_id === quiz.id);
      const order = quiz.kind === "final" ? 9999 : (positionOf.get(quiz.module_id ?? "") ?? 0);
      return {
        order,
        label: quiz.kind === "final" ? "Final assessment" : `Module ${order || quiz.slug} quiz`,
        learners: new Set(rows.map((row) => row.user_id)).size,
        attempts: rows.length,
        passRate: rows.length ? Math.round((rows.filter((row) => row.passed).length / rows.length) * 100) : 0,
        averageScore: rows.length
          ? Math.round(rows.reduce((sum, row) => sum + (row.score_percent ?? 0), 0) / rows.length)
          : 0,
      };
    })
    .filter((row) => row.attempts > 0)
    .sort((a, b) => a.order - b.order);

  const userIds = enrolled.map((row) => row.user_id);
  const [{ data: profiles }, emails] = await Promise.all([
    userIds.length ? admin.from("profiles").select("id, full_name").in("id", userIds) : Promise.resolve({ data: [] }),
    listUserEmails(admin),
  ]);
  const nameById = new Map((profiles ?? []).map((row) => [row.id, row.full_name.trim() || "Learner"]));

  const rows = enrolled.map((row) => {
    const last = progressBy.get(row.user_id)?.updated_at ?? row.created_at;
    return {
      id: row.user_id,
      name: nameById.get(row.user_id) ?? "Learner",
      email: emails.get(row.user_id) ?? "",
      percent: percentOf(row.user_id),
      enrolled: ago(row.created_at),
      lastActive: ago(last),
      idleDays: Math.floor((Date.now() - new Date(last).getTime()) / DAY),
    };
  });

  return {
    slug: course.slug,
    title: course.title,
    enrolled: enrolled.length,
    completed,
    averageProgress,
    certificates: certs?.length ?? 0,
    modules: funnel,
    quizzes: quizStats,
    stuck: rows
      .filter((row) => row.percent < 100 && row.idleDays >= 7)
      .sort((a, b) => b.idleDays - a.idleDays)
      .slice(0, 12)
      .map((row) => ({ id: row.id, name: row.name, email: row.email, percent: row.percent, idleDays: row.idleDays })),
    learners: rows
      .sort((a, b) => b.percent - a.percent)
      .map((row) => ({ name: row.name, email: row.email, percent: row.percent, enrolled: row.enrolled, lastActive: row.lastActive })),
  };
}
