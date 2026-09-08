"use server";

import { revalidatePath } from "next/cache";

import {
  classifyImageUpload,
  classifyUpload,
  COURSE_MEDIA_BUCKET,
  isMissingAssetsRelation,
  isUuid,
  MISSING_ASSETS_SQL,
  parseVideoUrl,
  safeFileName,
} from "@/lib/courses/media";
import type { LessonAsset } from "@/lib/courses/types";
import { getAuthUser, getUserRoles, isStaff, requireStaff } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type AssetsResult =
  | { ok: true; assets: LessonAsset[] }
  | { ok: false; error: string };

export type SignedAssetResult =
  | { ok: true; url: string; filename: string; kind: LessonAsset["kind"] }
  | { ok: false; error: string };

export type CoverResult =
  | { ok: true; path: string }
  | { ok: false; error: string };

function fail(error: string): AssetsResult {
  return { ok: false, error };
}

function toAsset(row: {
  id: string;
  lesson_id: string;
  position: number;
  kind: LessonAsset["kind"];
  title: string;
  storage_path: string | null;
  external_url: string | null;
}): LessonAsset {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    position: row.position,
    kind: row.kind,
    title: row.title,
    storagePath: row.storage_path,
    externalUrl: row.external_url,
  };
}

function revalidateLesson(courseSlug: string, lessonSlug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseSlug}`);
  revalidatePath(`/learn/${courseSlug}`);
  revalidatePath(`/learn/${courseSlug}/play`);
  if (lessonSlug) {
    revalidatePath(`/learn/${courseSlug}/lessons/${lessonSlug}`);
  }
}

function assetsError(message: string | undefined, fallback: string) {
  if (isMissingAssetsRelation(message)) return MISSING_ASSETS_SQL;
  return message || fallback;
}

async function listAssetsAdmin(lessonId: string): Promise<LessonAsset[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("lesson_assets")
    .select("id, lesson_id, position, kind, title, storage_path, external_url")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: true });
  if (error || !data) return [];
  return data.map(toAsset);
}

async function loadLessonContext(lessonId: string) {
  const admin = createAdminClient();
  const { data: lesson, error } = await admin
    .from("course_lessons")
    .select("id, slug, course_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (error || !lesson) return null;
  const { data: course } = await admin
    .from("courses")
    .select("slug")
    .eq("id", lesson.course_id)
    .maybeSingle();
  if (!course) return null;
  return {
    lessonId: lesson.id,
    lessonSlug: lesson.slug,
    courseId: lesson.course_id,
    courseSlug: course.slug,
  };
}

async function nextPosition(lessonId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("lesson_assets")
    .select("position")
    .eq("lesson_id", lessonId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 0) + 1;
}

export async function uploadLessonAsset(
  lessonId: string,
  formData: FormData
): Promise<AssetsResult> {
  await requireStaff();
  if (!isUuid(lessonId)) {
    return fail("Save this lesson first, then attach files or video URLs.");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("Choose a file to upload.");
  }
  const classified = classifyUpload(file);
  if (!classified.ok) return fail(classified.error);

  const context = await loadLessonContext(lessonId);
  if (!context) return fail("That lesson was not found.");

  const title = String(formData.get("title") ?? "").trim() || file.name.replace(/\.[^.]+$/, "");
  const id = crypto.randomUUID();
  const path = `${context.courseId}/${context.lessonId}/${id}-${safeFileName(file.name)}`;
  const admin = createAdminClient();

  const { error: uploadError } = await admin.storage
    .from(COURSE_MEDIA_BUCKET)
    .upload(path, file, { contentType: classified.mime, upsert: false });
  if (uploadError) {
    return fail(assetsError(uploadError.message, "Could not store that file."));
  }

  const { error: insertError } = await admin.from("lesson_assets").insert({
    id,
    lesson_id: lessonId,
    position: await nextPosition(lessonId),
    kind: classified.kind,
    title: title.slice(0, 160),
    storage_path: path,
  });
  if (insertError) {
    await admin.storage.from(COURSE_MEDIA_BUCKET).remove([path]);
    return fail(assetsError(insertError.message, "Could not attach that file."));
  }

  revalidateLesson(context.courseSlug, context.lessonSlug);
  return { ok: true, assets: await listAssetsAdmin(lessonId) };
}

export async function attachLessonVideoUrl(
  lessonId: string,
  rawUrl: string,
  title?: string
): Promise<AssetsResult> {
  await requireStaff();
  if (!isUuid(lessonId)) {
    return fail("Save this lesson first, then attach files or video URLs.");
  }

  const parsed = parseVideoUrl(rawUrl);
  if (!parsed) {
    return fail("Paste a YouTube or Vimeo URL. Other video hosts are not supported.");
  }

  const context = await loadLessonContext(lessonId);
  if (!context) return fail("That lesson was not found.");

  const admin = createAdminClient();
  const { error } = await admin.from("lesson_assets").insert({
    lesson_id: lessonId,
    position: await nextPosition(lessonId),
    kind: parsed.kind,
    title: (title?.trim() || (parsed.kind === "youtube" ? "YouTube video" : "Vimeo video")).slice(
      0,
      160
    ),
    external_url: parsed.url,
  });
  if (error) {
    return fail(assetsError(error.message, "Could not attach that video URL."));
  }

  revalidateLesson(context.courseSlug, context.lessonSlug);
  return { ok: true, assets: await listAssetsAdmin(lessonId) };
}

export async function reorderLessonAssets(
  lessonId: string,
  orderedIds: string[]
): Promise<AssetsResult> {
  await requireStaff();
  if (!isUuid(lessonId) || orderedIds.some((id) => !isUuid(id))) {
    return fail("Those lesson assets could not be reordered.");
  }

  const context = await loadLessonContext(lessonId);
  if (!context) return fail("That lesson was not found.");

  const admin = createAdminClient();
  const { data: existing, error: existingError } = await admin
    .from("lesson_assets")
    .select("id")
    .eq("lesson_id", lessonId);
  if (existingError) {
    return fail(assetsError(existingError.message, "Could not reorder lesson media."));
  }
  const allowed = new Set((existing ?? []).map((row) => row.id));
  if (!orderedIds.length || orderedIds.some((id) => !allowed.has(id)) || orderedIds.length !== allowed.size) {
    return fail("Those lesson assets could not be reordered.");
  }

  for (const [index, id] of orderedIds.entries()) {
    const { error } = await admin
      .from("lesson_assets")
      .update({ position: index + 1 })
      .eq("id", id)
      .eq("lesson_id", lessonId);
    if (error) {
      return fail(assetsError(error.message, "Could not reorder lesson media."));
    }
  }

  revalidateLesson(context.courseSlug, context.lessonSlug);
  return { ok: true, assets: await listAssetsAdmin(lessonId) };
}

export async function deleteLessonAsset(assetId: string): Promise<AssetsResult> {
  await requireStaff();
  if (!isUuid(assetId)) return fail("That file was not found.");

  const admin = createAdminClient();
  const { data: asset, error: loadError } = await admin
    .from("lesson_assets")
    .select("id, lesson_id, storage_path")
    .eq("id", assetId)
    .maybeSingle();
  if (loadError) {
    return fail(assetsError(loadError.message, "Could not remove that file."));
  }
  if (!asset) return fail("That file was not found.");

  const context = await loadLessonContext(asset.lesson_id);
  if (asset.storage_path) {
    await admin.storage.from(COURSE_MEDIA_BUCKET).remove([asset.storage_path]);
  }
  const { error } = await admin.from("lesson_assets").delete().eq("id", assetId);
  if (error) {
    return fail(assetsError(error.message, "Could not remove that file."));
  }

  if (context) revalidateLesson(context.courseSlug, context.lessonSlug);
  return { ok: true, assets: await listAssetsAdmin(asset.lesson_id) };
}

export async function uploadCourseCover(
  courseId: string,
  formData: FormData
): Promise<CoverResult> {
  await requireStaff();
  if (!isUuid(courseId)) {
    return { ok: false, error: "Save this course first, then upload a cover photo." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { ok: false, error: "Choose an image to upload." };
  }
  const classified = classifyImageUpload(file);
  if (!classified.ok) return { ok: false, error: classified.error };

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, slug, cover_path")
    .eq("id", courseId)
    .maybeSingle();
  if (!course) return { ok: false, error: "That course was not found." };

  const path = `${course.id}/cover-${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await admin.storage
    .from(COURSE_MEDIA_BUCKET)
    .upload(path, file, { contentType: classified.mime, upsert: false });
  if (uploadError) {
    return {
      ok: false,
      error: assetsError(uploadError.message, "Could not store that cover photo."),
    };
  }

  const { error: updateError } = await admin
    .from("courses")
    .update({ cover_path: path })
    .eq("id", course.id);
  if (updateError) {
    await admin.storage.from(COURSE_MEDIA_BUCKET).remove([path]);
    return { ok: false, error: updateError.message || "Could not save the cover photo." };
  }

  if (course.cover_path && !course.cover_path.startsWith("/") && !/^https?:\/\//i.test(course.cover_path)) {
    await admin.storage.from(COURSE_MEDIA_BUCKET).remove([course.cover_path]);
  }

  revalidateLesson(course.slug);
  revalidatePath("/courses");
  revalidatePath(`/courses/${course.slug}`);
  revalidatePath("/my");
  revalidatePath("/my/courses");
  return { ok: true, path };
}

export async function getLessonAssetSignedUrl(assetId: string): Promise<SignedAssetResult> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, error: "Sign in to open lesson media." };
  }
  if (!isUuid(assetId)) {
    return { ok: false, error: "That file was not found." };
  }

  const admin = createAdminClient();
  const { data: asset, error } = await admin
    .from("lesson_assets")
    .select("id, kind, title, storage_path, lesson_id")
    .eq("id", assetId)
    .maybeSingle();
  if (error) {
    return { ok: false, error: assetsError(error.message, "Could not open that file.") };
  }
  if (!asset?.storage_path) {
    return { ok: false, error: "That file is a link, not a download." };
  }

  const { data: lesson } = await admin
    .from("course_lessons")
    .select("course_id")
    .eq("id", asset.lesson_id)
    .maybeSingle();
  const courseId = lesson?.course_id;
  if (!courseId) return { ok: false, error: "That file was not found." };

  const roles = await getUserRoles(user.id);
  if (!isStaff(roles)) {
    const { data: enrolment } = await admin
      .from("enrolments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", courseId)
      .maybeSingle();
    if (!enrolment) {
      return { ok: false, error: "Enrol in this course to open lesson media." };
    }
  }

  const { data, error: signError } = await admin.storage
    .from(COURSE_MEDIA_BUCKET)
    .createSignedUrl(asset.storage_path, 60 * 10);
  if (signError || !data?.signedUrl) {
    return { ok: false, error: signError?.message || "Could not create a download link." };
  }

  const filename = asset.title.trim() || asset.storage_path.split("/").pop() || "lesson-media";
  return { ok: true, url: data.signedUrl, filename, kind: asset.kind };
}

export async function removeLessonMediaObjects(lessonIds: string[]) {
  const ids = lessonIds.filter(isUuid);
  if (!ids.length) return;
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return;
  }
  const { data } = await admin
    .from("lesson_assets")
    .select("storage_path")
    .in("lesson_id", ids);
  const paths = (data ?? [])
    .map((row) => row.storage_path)
    .filter((path): path is string => Boolean(path));
  if (paths.length) {
    await admin.storage.from(COURSE_MEDIA_BUCKET).remove(paths);
  }
}
