import "server-only";

import { getCatalogueCourse } from "@/lib/content/catalogue";
import {
  continueHref,
  emptyProgress,
  isCourseComplete,
  moduleCountFor,
  moduleLabelFor,
  progressPercent,
  thumbnailFor,
  type CourseProgress,
} from "@/lib/learning/progress";
import type { EnrolmentRecord, LearningSnapshot } from "@/lib/learning/types";
import { getAuthUser, requireUser } from "@/lib/permissions";
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

function toRecord(
  slug: string,
  title: string,
  progress: CourseProgress
): EnrolmentRecord {
  const catalogue = getCatalogueCourse(slug);
  const lessons = catalogue?.lessons ?? moduleCountFor(slug);
  return {
    slug,
    title: catalogue?.title ?? title,
    image: thumbnailFor(slug),
    lessons,
    progress,
    percent: progressPercent(progress, moduleCountFor(slug)),
    moduleLabel: moduleLabelFor(slug, progress),
    href: continueHref(slug, progress),
    complete: isCourseComplete(slug, progress),
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
  const { data: courseRows } = await supabase
    .from("courses")
    .select("id, slug, title")
    .in("id", courseIds);

  const { data: progressRows } = await supabase
    .from("course_progress")
    .select("course_id, current_module, completed_indexes, player_seconds")
    .eq("user_id", user.id);

  const courseById = new Map((courseRows ?? []).map((row) => [row.id, row]));
  const progressByCourse = new Map(
    (progressRows ?? []).map((row) => [row.course_id, toProgress(row)])
  );

  return enrolmentRows.flatMap((row) => {
    const meta = courseById.get(row.course_id);
    if (!meta) return [];
    return [
      toRecord(
        meta.slug,
        meta.title,
        progressByCourse.get(row.course_id) ?? emptyProgress()
      ),
    ];
  });
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
