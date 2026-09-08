import "server-only";

import { listUserEmails } from "@/lib/auth/admin-users";
import { liveLessonCountByCourseId } from "@/lib/courses/queries";
import {
  isStaff,
  requireOrgAccess,
  requireOrgAdmin,
  requireStaff,
} from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import type {
  LearnerOrgMembership,
  OrgDetail,
  OrgInviteRow,
  OrgMemberRow,
  OrgOption,
  OrgSummary,
  ReportRow,
} from "@/lib/org/types";

function isMissingOrgSchema(message: string | undefined) {
  if (!message) return false;
  return (
    message.includes("organisations") ||
    message.includes("organisation_memberships") ||
    message.includes("organisation_invites") ||
    message.includes("schema cache")
  );
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function quizLabel(
  passed: boolean | null | undefined
): "pass" | "fail" | "none" {
  if (passed === true) return "pass";
  if (passed === false) return "fail";
  return "none";
}

async function emailsOrEmpty() {
  try {
    return await listUserEmails(createAdminClient());
  } catch {
    return new Map<string, string>();
  }
}

export async function listOrganisations(): Promise<OrgSummary[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("id, name, status, seat_limit, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingOrgSchema(error.message)) return [];
    return [];
  }
  const ids = (data ?? []).map((row) => row.id);
  const used = new Map<string, number>();
  if (ids.length) {
    const { data: memberships } = await supabase
      .from("organisation_memberships")
      .select("organisation_id")
      .in("organisation_id", ids);
    for (const row of memberships ?? []) {
      used.set(row.organisation_id, (used.get(row.organisation_id) ?? 0) + 1);
    }
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    seatLimit: row.seat_limit,
    seatsUsed: used.get(row.id) ?? 0,
    createdAt: formatDate(row.created_at),
  }));
}

export async function listOrgOptions(): Promise<OrgOption[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("id, name, status")
    .order("name", { ascending: true });
  if (error) {
    if (isMissingOrgSchema(error.message)) return [];
    return [];
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
  }));
}

export async function listLearnerOrganisations(
  userId: string
): Promise<LearnerOrgMembership[]> {
  await requireStaff();
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisation_memberships")
    .select("organisation_id, role")
    .eq("user_id", userId);
  if (error) {
    if (isMissingOrgSchema(error.message)) return [];
    return [];
  }
  if (!data?.length) return [];
  const { data: orgs } = await supabase
    .from("organisations")
    .select("id, name")
    .in(
      "id",
      data.map((row) => row.organisation_id)
    );
  const nameById = new Map((orgs ?? []).map((org) => [org.id, org.name]));
  return data.map((row) => ({
    organisationId: row.organisation_id,
    name: nameById.get(row.organisation_id) ?? "Organisation",
    role: row.role,
  }));
}

export async function getOrganisation(organisationId: string): Promise<OrgSummary | null> {
  await requireOrgAdmin(organisationId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("id, name, status, seat_limit, created_at")
    .eq("id", organisationId)
    .maybeSingle();
  if (error || !data) return null;
  const { count } = await supabase
    .from("organisation_memberships")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId);
  return {
    id: data.id,
    name: data.name,
    status: data.status,
    seatLimit: data.seat_limit,
    seatsUsed: count ?? 0,
    createdAt: formatDate(data.created_at),
  };
}

async function publishedCourses() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id, slug, title")
    .eq("status", "published")
    .order("title", { ascending: true });
  return data ?? [];
}

type QuizOutcome = "pass" | "fail" | "none";
type CertOutcome = "issued" | "revoked" | "none";

async function loadLearningMaps(userIds: string[]) {
  const empty = {
    courseById: new Map<string, { slug: string; title: string }>(),
    liveCounts: new Map<string, number>(),
    enrolments: [] as { user_id: string; course_id: string; created_at: string }[],
    progress: new Map<string, number>(),
    quiz: new Map<string, QuizOutcome>(),
    cert: new Map<string, CertOutcome>(),
  };
  if (!userIds.length) return empty;

  const supabase = await createClient();
  const [{ data: courses }, liveCounts, { data: enrolments }, { data: progressRows }] =
    await Promise.all([
      supabase.from("courses").select("id, slug, title"),
      liveLessonCountByCourseId(),
      supabase
        .from("enrolments")
        .select("user_id, course_id, created_at")
        .in("user_id", userIds),
      supabase
        .from("course_progress")
        .select("user_id, course_id, completed_indexes")
        .in("user_id", userIds),
    ]);

  const courseById = new Map(
    (courses ?? []).map((course) => [course.id, { slug: course.slug, title: course.title }])
  );
  const progress = new Map<string, number>();
  for (const row of progressRows ?? []) {
    progress.set(`${row.user_id}:${row.course_id}`, (row.completed_indexes ?? []).length);
  }

  const { data: quizzes } = await supabase.from("quizzes").select("id, course_id");
  const quizCourse = new Map((quizzes ?? []).map((quiz) => [quiz.id, quiz.course_id]));
  const quizIds = [...quizCourse.keys()];
  const quiz = new Map<string, QuizOutcome>();
  if (quizIds.length) {
    const { data: attempts } = await supabase
      .from("quiz_attempts")
      .select("user_id, quiz_id, passed, submitted_at")
      .in("user_id", userIds)
      .not("submitted_at", "is", null);
    for (const attempt of attempts ?? []) {
      const courseId = quizCourse.get(attempt.quiz_id);
      if (!courseId) continue;
      const key = `${attempt.user_id}:${courseId}`;
      if (attempt.passed) quiz.set(key, "pass");
      else if (quiz.get(key) !== "pass") quiz.set(key, "fail");
    }
  }

  const { data: certs } = await supabase
    .from("certificates")
    .select("user_id, course_id, status")
    .in("user_id", userIds);
  const cert = new Map<string, CertOutcome>();
  for (const row of certs ?? []) {
    const key = `${row.user_id}:${row.course_id}`;
    if (row.status === "valid") cert.set(key, "issued");
    else if (cert.get(key) !== "issued") cert.set(key, "revoked");
  }

  return {
    courseById,
    liveCounts,
    enrolments: enrolments ?? [],
    progress,
    quiz,
    cert,
  };
}

function memberRowsFrom(
  members: { user_id: string; role: "member" | "admin"; created_at: string }[],
  names: Map<string, string>,
  emails: Map<string, string>,
  learning: Awaited<ReturnType<typeof loadLearningMaps>>
): OrgMemberRow[] {
  const enrolmentsByUser = new Map<string, typeof learning.enrolments>();
  for (const row of learning.enrolments) {
    const list = enrolmentsByUser.get(row.user_id) ?? [];
    list.push(row);
    enrolmentsByUser.set(row.user_id, list);
  }

  const rows: OrgMemberRow[] = [];
  for (const member of members) {
    const enrolled = enrolmentsByUser.get(member.user_id) ?? [];
    const base = {
      userId: member.user_id,
      name: names.get(member.user_id) || "Learner",
      email: emails.get(member.user_id) ?? "",
      role: member.role,
      joined: formatDate(member.created_at),
    };
    if (enrolled.length === 0) {
      rows.push({
        ...base,
        courseTitle: "—",
        courseSlug: "",
        completed: 0,
        total: 0,
        quizResult: "none",
        certificate: "none",
      });
      continue;
    }
    for (const enrolment of enrolled) {
      const course = learning.courseById.get(enrolment.course_id);
      const key = `${member.user_id}:${enrolment.course_id}`;
      rows.push({
        ...base,
        courseTitle: course?.title ?? "Course",
        courseSlug: course?.slug ?? "",
        completed: learning.progress.get(key) ?? 0,
        total: learning.liveCounts.get(enrolment.course_id) ?? 0,
        quizResult: learning.quiz.get(key) ?? "none",
        certificate: learning.cert.get(key) ?? "none",
      });
    }
  }
  return rows;
}

export async function getOrgDetail(organisationId: string): Promise<OrgDetail | null> {
  const org = await getOrganisation(organisationId);
  if (!org) return null;
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("organisation_memberships")
    .select("user_id, role, created_at")
    .eq("organisation_id", organisationId)
    .order("created_at", { ascending: true });
  if (error) return { org, members: [], invites: [], courses: await publishedCourses() };

  const userIds = (memberships ?? []).map((row) => row.user_id);
  const [{ data: profiles }, emails, learning, { data: inviteRows }] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    emailsOrEmpty(),
    loadLearningMaps(userIds),
    supabase
      .from("organisation_invites")
      .select("id, code, course_id, uses, max_uses, expires_at, created_at")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false }),
  ]);

  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name.trim()]));
  const courses = await publishedCourses();
  const courseTitleById = new Map(courses.map((course) => [course.id, course.title]));

  const invites: OrgInviteRow[] = (inviteRows ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    courseTitle: row.course_id ? (courseTitleById.get(row.course_id) ?? "Course") : null,
    uses: row.uses,
    maxUses: row.max_uses,
    expiresAt: row.expires_at ? formatDate(row.expires_at) : null,
    createdAt: formatDate(row.created_at),
  }));

  return {
    org,
    members: memberRowsFrom(memberships ?? [], names, emails, learning),
    invites,
    courses,
  };
}

export async function getOrgDashboard(organisationId?: string): Promise<{
  org: OrgSummary | null;
  members: OrgMemberRow[];
  invites: OrgInviteRow[];
  courses: { id: string; slug: string; title: string }[];
  staffOrgs: OrgOption[];
}> {
  const { user, roles } = await requireOrgAccess();
  const supabase = await createClient();
  const staff = isStaff(roles);
  let orgId = organisationId;

  if (orgId) {
    await requireOrgAdmin(orgId);
  } else if (staff) {
    const { data } = await supabase
      .from("organisations")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    orgId = data?.id;
  } else {
    const { data } = await supabase
      .from("organisation_memberships")
      .select("organisation_id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();
    orgId = data?.organisation_id;
  }

  const staffOrgs = staff ? await listOrgOptions() : [];
  if (!orgId) {
    return { org: null, members: [], invites: [], courses: await publishedCourses(), staffOrgs };
  }

  const detail = await getOrgDetail(orgId);
  if (!detail) {
    return { org: null, members: [], invites: [], courses: await publishedCourses(), staffOrgs };
  }
  return { ...detail, staffOrgs };
}

export async function listReportRows(organisationId?: string): Promise<ReportRow[]> {
  if (organisationId) {
    await requireOrgAdmin(organisationId);
  } else {
    await requireStaff();
  }

  const supabase = await createClient();
  let memberUserIds: string[] | null = null;
  const orgNameByUser = new Map<string, string>();
  const orgIdByUser = new Map<string, string>();

  if (organisationId) {
    const { data: memberships } = await supabase
      .from("organisation_memberships")
      .select("user_id")
      .eq("organisation_id", organisationId);
    memberUserIds = (memberships ?? []).map((row) => row.user_id);
    const org = await getOrganisation(organisationId);
    for (const userId of memberUserIds) {
      orgNameByUser.set(userId, org?.name ?? "");
      orgIdByUser.set(userId, organisationId);
    }
  } else {
    const { data: memberships } = await supabase
      .from("organisation_memberships")
      .select("user_id, organisation_id");
    const { data: orgs } = await supabase.from("organisations").select("id, name");
    const nameById = new Map((orgs ?? []).map((org) => [org.id, org.name]));
    for (const row of memberships ?? []) {
      orgNameByUser.set(row.user_id, nameById.get(row.organisation_id) ?? "");
      orgIdByUser.set(row.user_id, row.organisation_id);
    }
  }

  let enrolmentQuery = supabase
    .from("enrolments")
    .select("user_id, course_id, created_at")
    .order("created_at", { ascending: false });
  if (memberUserIds) {
    if (memberUserIds.length === 0) return [];
    enrolmentQuery = enrolmentQuery.in("user_id", memberUserIds);
  }
  const { data: enrolments } = await enrolmentQuery;
  if (!enrolments?.length) return [];

  const userIds = [...new Set(enrolments.map((row) => row.user_id))];
  const [{ data: profiles }, emails, learning] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", userIds),
    emailsOrEmpty(),
    loadLearningMaps(userIds),
  ]);
  const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name.trim()]));

  return enrolments.map((row) => {
    const course = learning.courseById.get(row.course_id);
    const key = `${row.user_id}:${row.course_id}`;
    const orgName = orgNameByUser.get(row.user_id) ?? "";
    return {
      userId: row.user_id,
      name: names.get(row.user_id) || "Learner",
      email: emails.get(row.user_id) ?? "",
      organisationName: orgName || "Unattached",
      organisationId: orgIdByUser.get(row.user_id) ?? null,
      courseTitle: course?.title ?? "Course",
      courseSlug: course?.slug ?? "",
      enrolledAt: formatDate(row.created_at),
      completed: learning.progress.get(key) ?? 0,
      total: learning.liveCounts.get(row.course_id) ?? 0,
      quizResult: learning.quiz.get(key) ?? quizLabel(null),
      certificate: learning.cert.get(key) ?? "none",
    };
  });
}
