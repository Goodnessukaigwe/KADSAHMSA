import { completeAvatarUpload, prepareAvatarUpload, type AvatarResult } from "@/lib/profile/actions";
import { AVATARS_BUCKET, classifyAvatarUpload } from "@/lib/profile/media";
import { createClient } from "@/lib/supabase/client";

export async function uploadAvatarFile(file: File): Promise<AvatarResult> {
  const classified = classifyAvatarUpload(file);
  if (!classified.ok) return classified;

  const prepared = await prepareAvatarUpload({
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
  });
  if (!prepared.ok) return prepared;

  const supabase = createClient();
  const uploaded = await supabase.storage
    .from(AVATARS_BUCKET)
    .uploadToSignedUrl(prepared.path, prepared.token, file, {
      contentType: classified.mime,
      upsert: false,
    });

  if (uploaded.error) {
    return { ok: false, error: uploaded.error.message || "Could not store that photo." };
  }

  return completeAvatarUpload({ path: prepared.path });
}
