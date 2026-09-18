import {
  completeLessonAssetUpload,
  prepareLessonAssetUpload,
  type AssetsResult,
} from "@/lib/courses/asset-actions";
import { classifyUpload, COURSE_MEDIA_BUCKET } from "@/lib/courses/media";
import { createClient } from "@/lib/supabase/client";

export async function uploadLessonFile(
  lessonId: string,
  file: File,
  section?: string | null
): Promise<AssetsResult> {
  const classified = classifyUpload(file);
  if (!classified.ok) return classified;

  const prepared = await prepareLessonAssetUpload({
    lessonId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    title: file.name.replace(/\.[^.]+$/, ""),
    section: section ?? null,
  });
  if (!prepared.ok) return prepared;

  const supabase = createClient();
  const uploaded = await supabase.storage
    .from(COURSE_MEDIA_BUCKET)
    .uploadToSignedUrl(prepared.path, prepared.token, file, {
      contentType: classified.mime,
      upsert: false,
    });

  if (uploaded.error) {
    return { ok: false, error: uploaded.error.message || "Could not store that file." };
  }

  return completeLessonAssetUpload({
    id: prepared.id,
    lessonId,
    path: prepared.path,
    kind: prepared.kind,
    title: prepared.title,
    section: prepared.section,
  });
}
