import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  COURSE_MEDIA_BUCKET,
  isPublicCoverPath,
  isStockLandingCover,
} from "@/lib/courses/media";
import type { Database } from "@/lib/supabase/database";

type AdminClient = SupabaseClient<Database>;

const IMAGE_NAME = /\.(jpe?g|png|webp|gif)$/i;

export function storedCoverPath(coverPath?: string | null) {
  const trimmed = coverPath?.trim() ?? "";
  if (!trimmed || isStockLandingCover(trimmed)) return "";
  return trimmed;
}

/** First lesson image (kind=image), ordered by lesson then asset position. */
export async function firstLessonImageCoverPath(
  admin: AdminClient,
  courseId: string
) {
  const [{ data: lessons, error: lessonError }, { data: moduleRows }] = await Promise.all([
    admin.from("course_lessons").select("id, position, module_id").eq("course_id", courseId),
    admin.from("course_modules").select("id, position").eq("course_id", courseId),
  ]);
  if (lessonError || !lessons?.length) return "";

  const modulePos = new Map((moduleRows ?? []).map((row) => [row.id, row.position]));
  const lessonIds = [...lessons]
    .sort(
      (a, b) =>
        (modulePos.get(a.module_id) ?? a.position) - (modulePos.get(b.module_id) ?? b.position) ||
        a.position - b.position
    )
    .map((row) => row.id);
  const { data: assets, error: assetError } = await admin
    .from("lesson_assets")
    .select("storage_path, external_url, lesson_id, position")
    .in("lesson_id", lessonIds)
    .eq("kind", "image")
    .order("position", { ascending: true });
  if (assetError || !assets?.length) return "";

  const lessonOrder = new Map(lessonIds.map((id, index) => [id, index]));
  const first = [...assets].sort((a, b) => {
    const byLesson =
      (lessonOrder.get(a.lesson_id) ?? 0) - (lessonOrder.get(b.lesson_id) ?? 0);
    if (byLesson !== 0) return byLesson;
    return a.position - b.position;
  })[0];
  if (!first) return "";

  const storage = first.storage_path?.trim() ?? "";
  if (storage) return storage;
  return first.external_url?.trim() ?? "";
}

async function firstStoredImagePath(admin: AdminClient, courseId: string) {
  const { data: entries } = await admin.storage
    .from(COURSE_MEDIA_BUCKET)
    .list(courseId, { limit: 100, sortBy: { column: "name", order: "asc" } });
  if (!entries?.length) return "";

  const files = entries.filter((entry) => IMAGE_NAME.test(entry.name));
  const coverFile = files.find((entry) => entry.name.startsWith("cover-"));
  const imageFile = coverFile ?? files[0];
  if (imageFile) return `${courseId}/${imageFile.name}`;

  for (const entry of entries) {
    if (IMAGE_NAME.test(entry.name)) continue;
    const { data: children } = await admin.storage
      .from(COURSE_MEDIA_BUCKET)
      .list(`${courseId}/${entry.name}`, {
        limit: 100,
        sortBy: { column: "name", order: "asc" },
      });
    const child = (children ?? []).find((item) => IMAGE_NAME.test(item.name));
    if (child) return `${courseId}/${entry.name}/${child.name}`;
  }
  return "";
}

async function signCoverPath(admin: AdminClient, path: string) {
  const trimmed = path.trim();
  if (!trimmed) return "";
  if (isPublicCoverPath(trimmed)) return trimmed;
  const { data } = await admin.storage
    .from(COURSE_MEDIA_BUCKET)
    .createSignedUrl(trimmed, 60 * 60);
  return data?.signedUrl ?? "";
}

/** cover_path, else first lesson image, else first image still in the course folder. */
export async function resolveWorkingCoverUrl(
  admin: AdminClient,
  courseId: string,
  coverPath?: string | null
) {
  const seen = new Set<string>();
  const candidates = [
    storedCoverPath(coverPath),
    await firstLessonImageCoverPath(admin, courseId),
    await firstStoredImagePath(admin, courseId),
  ];
  for (const candidate of candidates) {
    if (!candidate || seen.has(candidate)) continue;
    seen.add(candidate);
    const url = await signCoverPath(admin, candidate);
    if (url) return url;
  }
  return "";
}
