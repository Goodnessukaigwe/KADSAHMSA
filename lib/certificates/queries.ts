import "server-only";

import { liveLessonCountByCourseId } from "@/lib/courses/queries";
import { finalQuizMeta, quizMeta } from "@/lib/content/dptc";
import { moduleCountFor } from "@/lib/learning/progress";
import { getAuthUser, requireStaff, requireUser } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type LearnerCertificate = {
  id: string;
  title: string;
  issued: string;
  verificationId: string;
  status: "valid" | "revoked";
};

export type StaffCertificate = LearnerCertificate & {
  scorePercent: number;
};

function formatIssued(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export async function listMyCertificates(): Promise<LearnerCertificate[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("certificates")
    .select("id, verification_id, issued_at, status, course_id")
    .eq("user_id", user.id)
    .order("issued_at", { ascending: false });
  if (!rows?.length) return [];

  const courseIds = [...new Set(rows.map((row) => row.course_id))];
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .in("id", courseIds);
  const titleById = new Map((courses ?? []).map((course) => [course.id, course.title]));

  return rows.map((row) => ({
    id: row.id,
    title: titleById.get(row.course_id) ?? "Certificate",
    issued: formatIssued(row.issued_at),
    verificationId: row.verification_id,
    status: row.status,
  }));
}

export async function countMyCertificates() {
  const certs = await listMyCertificates();
  return certs.length;
}

export async function getCertificatesForUser(userId: string): Promise<StaffCertificate[]> {
  await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return [];
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("certificates")
    .select("id, verification_id, issued_at, status, score_percent, course_id")
    .eq("user_id", userId)
    .order("issued_at", { ascending: false });
  if (!rows?.length) return [];

  const courseIds = [...new Set(rows.map((row) => row.course_id))];
  const { data: courses } = await supabase
    .from("courses")
    .select("id, title")
    .in("id", courseIds);
  const titleById = new Map((courses ?? []).map((course) => [course.id, course.title]));

  return rows.map((row) => ({
    id: row.id,
    title: titleById.get(row.course_id) ?? "Certificate",
    issued: formatIssued(row.issued_at),
    verificationId: row.verification_id,
    status: row.status,
    scorePercent: row.score_percent,
  }));
}

export type StaffLearnerRow = {
  id: string;
  name: string;
  email: string;
  certificateCount: number;
  joined: string;
  organisationName: string;
};

export async function listStaffLearners(): Promise<StaffLearnerRow[]> {
  await requireStaff();
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return [];
  }
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, created_at")
    .order("created_at", { ascending: false });
  if (!profiles?.length) return [];

  const { data: certs } = await admin.from("certificates").select("user_id");
  const countByUser = new Map<string, number>();
  for (const cert of certs ?? []) {
    countByUser.set(cert.user_id, (countByUser.get(cert.user_id) ?? 0) + 1);
  }

  const emails = new Map<string, string>();
  const { data } = await admin.auth.admin.listUsers({ perPage: 200 });
  for (const user of data.users) {
    emails.set(user.id, user.email ?? "");
  }

  const orgNames = new Map<string, string[]>();
  const { data: memberships } = await admin
    .from("organisation_memberships")
    .select("user_id, organisation_id");
  if (memberships?.length) {
    const { data: orgs } = await admin.from("organisations").select("id, name");
    const nameById = new Map((orgs ?? []).map((org) => [org.id, org.name]));
    for (const row of memberships) {
      const name = nameById.get(row.organisation_id);
      if (!name) continue;
      const current = orgNames.get(row.user_id) ?? [];
      if (!current.includes(name)) current.push(name);
      orgNames.set(row.user_id, current);
    }
  }

  return profiles.map((profile) => ({
    id: profile.id,
    name: profile.full_name.trim() || "Learner",
    email: emails.get(profile.id) ?? "",
    certificateCount: countByUser.get(profile.id) ?? 0,
    joined: formatIssued(profile.created_at),
    organisationName: (orgNames.get(profile.id) ?? []).join(", "),
  }));
}

export type StaffEnrolmentProgress = {
  slug: string;
  title: string;
  completed: number;
  total: number;
  percent: number;
};

export type StaffActivityItem = {
  id: string;
  label: string;
  when: string;
  tone: "event" | "approved";
};

export type StaffLearnerLearning = {
  enrolments: StaffEnrolmentProgress[];
  activity: StaffActivityItem[];
};

export const emptyStaffLearning: StaffLearnerLearning = {
  enrolments: [],
  activity: [],
};

function quizTitleFor(slug: string) {
  if (slug === "module-1") return quizMeta.title;
  if (slug === "final") return finalQuizMeta.title;
  return "Quiz";
}

export async function getStaffLearnerLearning(
  userId: string
): Promise<StaffLearnerLearning> {
  await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return emptyStaffLearning;

  const supabase = await createClient();
  const [
    { data: enrolmentRows },
    { data: progressRows },
    { data: attemptRows },
    { data: certRows },
  ] = await Promise.all([
    supabase
      .from("enrolments")
      .select("id, course_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("course_progress")
      .select("course_id, completed_indexes")
      .eq("user_id", userId),
    supabase
      .from("quiz_attempts")
      .select("id, quiz_id, score_percent, passed, submitted_at, attempt_no")
      .eq("user_id", userId)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("certificates")
      .select("id, course_id, issued_at, status")
      .eq("user_id", userId),
  ]);

  const courseIds = [
    ...new Set([
      ...(enrolmentRows ?? []).map((row) => row.course_id),
      ...(certRows ?? []).map((row) => row.course_id),
    ]),
  ];
  const quizIds = [...new Set((attemptRows ?? []).map((row) => row.quiz_id))];
  const certIds = (certRows ?? []).map((row) => row.id);

  const [courseRows, quizRows, revokeRows] = await Promise.all([
    courseIds.length
      ? supabase.from("courses").select("id, slug, title").in("id", courseIds).then((res) => res.data)
      : Promise.resolve([]),
    quizIds.length
      ? supabase.from("quizzes").select("id, slug").in("id", quizIds).then((res) => res.data)
      : Promise.resolve([]),
    certIds.length
      ? supabase
          .from("certificate_revocations")
          .select("id, certificate_id, revoked_at")
          .in("certificate_id", certIds)
          .then((res) => res.data)
      : Promise.resolve([]),
  ]);

  const courseById = new Map((courseRows ?? []).map((course) => [course.id, course]));
  const completedByCourse = new Map(
    (progressRows ?? []).map((row) => [row.course_id, row.completed_indexes ?? []])
  );
  const quizSlugById = new Map((quizRows ?? []).map((quiz) => [quiz.id, quiz.slug]));
  const liveCounts = await liveLessonCountByCourseId();

  const enrolments: StaffEnrolmentProgress[] = (enrolmentRows ?? []).flatMap((row) => {
    const course = courseById.get(row.course_id);
    if (!course) return [];
    const total = moduleCountFor(course.slug, liveCounts.get(row.course_id));
    const completed = Math.min(total, new Set(completedByCourse.get(row.course_id) ?? []).size);
    return [
      {
        slug: course.slug,
        title: course.title,
        completed,
        total,
        percent: total ? Math.round((completed / total) * 100) : 0,
      },
    ];
  });

  type RawEvent = {
    id: string;
    at: string;
    label: string;
    tone: StaffActivityItem["tone"];
  };
  const events: RawEvent[] = [];

  for (const row of enrolmentRows ?? []) {
    const course = courseById.get(row.course_id);
    events.push({
      id: `enrol-${row.id}`,
      at: row.created_at,
      label: course ? `Enrolled in ${course.title}` : "Enrolled in a course",
      tone: "event",
    });
  }

  for (const row of attemptRows ?? []) {
    if (!row.submitted_at || row.score_percent == null) continue;
    const title = quizTitleFor(quizSlugById.get(row.quiz_id) ?? "");
    events.push({
      id: `quiz-${row.id}`,
      at: row.submitted_at,
      label: `${row.passed ? "Passed" : "Did not pass"} ${title} — ${row.score_percent}% (attempt ${row.attempt_no})`,
      tone: row.passed ? "approved" : "event",
    });
  }

  for (const row of certRows ?? []) {
    const course = courseById.get(row.course_id);
    events.push({
      id: `cert-${row.id}`,
      at: row.issued_at,
      label: `Certificate issued for ${course?.title ?? "a course"}`,
      tone: "approved",
    });
  }

  for (const row of revokeRows ?? []) {
    const cert = (certRows ?? []).find((item) => item.id === row.certificate_id);
    const course = cert ? courseById.get(cert.course_id) : undefined;
    events.push({
      id: `rev-${row.id}`,
      at: row.revoked_at,
      label: `Certificate revoked for ${course?.title ?? "a course"}`,
      tone: "event",
    });
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  return {
    enrolments,
    activity: events.slice(0, 20).map((item) => ({
      id: item.id,
      label: item.label,
      when: formatIssued(item.at),
      tone: item.tone,
    })),
  };
}

export async function getStaffLearner(userId: string): Promise<StaffLearnerRow | null> {
  await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("id", userId)
    .maybeSingle();
  if (!profile) return null;

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const { count } = await admin
    .from("certificates")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const { data: memberships } = await admin
    .from("organisation_memberships")
    .select("organisation_id")
    .eq("user_id", userId);
  let organisationName = "";
  if (memberships?.length) {
    const { data: orgs } = await admin
      .from("organisations")
      .select("id, name")
      .in(
        "id",
        memberships.map((row) => row.organisation_id)
      );
    organisationName = (orgs ?? []).map((org) => org.name).join(", ");
  }

  return {
    id: profile.id,
    name: profile.full_name.trim() || "Learner",
    email: authUser.user?.email ?? "",
    certificateCount: count ?? 0,
    joined: formatIssued(profile.created_at),
    organisationName,
  };
}

export async function requireOwnCertificate(certificateId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("certificates")
    .select("id, user_id, storage_path, verification_id, status")
    .eq("id", certificateId)
    .maybeSingle();
  if (!data || data.user_id !== user.id) return null;
  return data;
}
