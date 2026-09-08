import "server-only";

import { redirect } from "next/navigation";

import {
  continuePathFor,
  liveLessonCountByCourseId,
  resolveCoverSrc,
} from "@/lib/courses/queries";
import {
  emptyProgress,
  isCourseComplete,
  moduleCountFor,
  moduleLabelFor,
  progressPercent,
  type CourseProgress,
} from "@/lib/learning/progress";
import type { EnrolmentRecord, LearningSnapshot } from "@/lib/learning/types";
import { getAuthUser, isStaffUser, requireUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export type { EnrolmentRecord, LearningSnapshot };

function toProgress(row: {
  current_module: number;
  completed_indexes: number[] | null;
  player_seconds: number;
} | null): CourseProgress {
  if (!row) return emptyProgress();
  return {
    currentModule: row.current_module || 1,
    completed: row.completed_indexes ?? [],
    playerSeconds: row.player_seconds ?? 0,
  };
}

async function toRecord(
  slug: string,
  title: string,
  progress: CourseProgress,
  liveCount: number,
  href: string,
  coverPath?: string | null
): Promise<EnrolmentRecord> {
  const lessons = moduleCountFor(slug, liveCount);
  return {
    slug,
    title,
    image: await resolveCoverSrc(slug, coverPath),
    lessons,
    progress,
    percent: progressPercent(progress, lessons),
    moduleLabel: moduleLabelFor(slug, progress, lessons),
    href,
    complete: isCourseComplete(slug, progress, lessons),
  };
}

export async function getCourseIdBySlug(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return data?.id ?? null;
}

export async function listMyEnrolments(): Promise<EnrolmentRecord[]> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: enrolmentRows, error: enrolmentError } = await supabase
    .from("enrolments")
    .select("course_id")
    .eq("user_id", user.id);

  if (enrolmentError || !enrolmentRows?.length) return [];

  const courseIds = enrolmentRows.map((row) => row.course_id);
  const { data: courseRows, error: courseError } = await supabase
    .from("courses")
    .select("id, slug, title, cover_path, status")
    .in("id", courseIds);
  const courses =
    courseError || !courseRows
      ? (
          await supabase
            .from("courses")
            .select("id, slug, title, status")
            .in("id", courseIds)
        ).data?.map((row) => ({ ...row, cover_path: "" })) ?? []
      : courseRows;

  const { data: progressRows } = await supabase
    .from("course_progress")
    .select("course_id, current_module, completed_indexes, player_seconds")
    .eq("user_id", user.id);

  const courseById = new Map(courses.map((row) => [row.id, row]));
  const progressByCourse = new Map(
    (progressRows ?? []).map((row) => [row.course_id, toProgress(row)])
  );
  const liveCounts = await liveLessonCountByCourseId();

  return Promise.all(
    enrolmentRows.flatMap((row) => {
      const meta = courseById.get(row.course_id);
      if (!meta) return [];
      if ("status" in meta && meta.status && meta.status !== "published") return [];
      const progress = progressByCourse.get(row.course_id) ?? emptyProgress();
      const liveCount = liveCounts.get(row.course_id) ?? 0;
      return [
        continuePathFor(meta.slug, progress.currentModule).then((href) =>
          toRecord(meta.slug, meta.title, progress, liveCount, href, meta.cover_path)
        ),
      ];
    })
  );
}

export async function getLearningSnapshot(): Promise<LearningSnapshot> {
  const enrolments = await listMyEnrolments();
  return {
    enrolments,
    inProgress: enrolments.filter((item) => !item.complete),
    completed: enrolments.filter((item) => item.complete),
    enrolledSlugs: enrolments.map((item) => item.slug),
  };
}

export async function getMyProgress(slug: string): Promise<CourseProgress> {
  const user = await getAuthUser();
  if (!user) return emptyProgress();
  const courseId = await getCourseIdBySlug(slug);
  if (!courseId) return emptyProgress();

  const supabase = await createClient();
  const { data } = await supabase
    .from("course_progress")
    .select("current_module, completed_indexes, player_seconds")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  return toProgress(data);
}

export async function isEnrolledIn(slug: string): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  const courseId = await getCourseIdBySlug(slug);
  if (!courseId) return false;

  const supabase = await createClient();
  const { data } = await supabase
    .from("enrolments")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();

  return Boolean(data);
}

function isMissingRequests(message: string | undefined) {
  return Boolean(
    message &&
      (message.includes("enrolment_requests") || message.includes("schema cache"))
  );
}

export async function hasRequestedEnrolment(slug: string): Promise<boolean> {
  const user = await getAuthUser();
  if (!user) return false;
  const courseId = await getCourseIdBySlug(slug);
  if (!courseId) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("enrolment_requests")
    .select("id")
    .eq("user_id", user.id)
    .eq("course_id", courseId)
    .maybeSingle();
  if (error && isMissingRequests(error.message)) return false;
  return Boolean(data);
}

export async function listMyRequestedSlugs(): Promise<string[]> {
  const user = await getAuthUser();
  if (!user) return [];

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("enrolment_requests")
    .select("course_id")
    .eq("user_id", user.id);
  if (error || !rows?.length) return [];

  const { data: courses } = await supabase
    .from("courses")
    .select("id, slug")
    .in(
      "id",
      rows.map((row) => row.course_id)
    );
  return (courses ?? []).map((row) => row.slug);
}

/** Lessons, player, and quizzes need a real enrolment. Staff may preview. */
export async function requireEnrolmentOrStaff(slug: string): Promise<void> {
  if (await isStaffUser()) return;
  if (await isEnrolledIn(slug)) return;
  redirect(`/courses/${slug}`);
}
