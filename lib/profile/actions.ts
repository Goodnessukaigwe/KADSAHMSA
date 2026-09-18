"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/permissions";
import {
  AVATARS_BUCKET,
  avatarPublicUrl,
  avatarUploadError,
  classifyAvatarMeta,
  isMissingAvatarColumn,
  isOwnAvatarPath,
  MISSING_AVATARS_SQL,
  safeAvatarFileName,
} from "@/lib/profile/media";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type ProfileNameResult = { ok: true } | { ok: false; error: string };
export type AvatarResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; error: string };

type PreparedAvatarUpload =
  | { ok: true; path: string; token: string; mime: string }
  | { ok: false; error: string };

function revalidateProfileSurfaces() {
  revalidatePath("/my", "layout");
  revalidatePath("/admin", "layout");
  revalidatePath("/org", "layout");
}

export async function updateProfileName(name: string): Promise<ProfileNameResult> {
  const user = await requireUser();
  const fullName = name.trim();
  if (fullName.length < 2) {
    return { ok: false, error: "Enter your name." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.slice(0, 120) })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message || "Could not save your name." };
  }

  await supabase.auth.updateUser({ data: { full_name: fullName.slice(0, 120) } });
  revalidateProfileSurfaces();
  return { ok: true };
}

export async function prepareAvatarUpload(input: {
  fileName: string;
  fileType: string;
  fileSize: number;
}): Promise<PreparedAvatarUpload> {
  const user = await requireUser();
  const classified = classifyAvatarMeta(input.fileName, input.fileType, input.fileSize);
  if (!classified.ok) return classified;

  const path = `${user.id}/${crypto.randomUUID()}-${safeAvatarFileName(input.fileName)}`;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage
      .from(AVATARS_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data?.token) {
      return {
        ok: false,
        error: avatarUploadError(error?.message, "Could not start that upload."),
      };
    }
    return { ok: true, path, token: data.token, mime: classified.mime };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    return { ok: false, error: avatarUploadError(message, "Could not start that upload.") };
  }
}

export async function completeAvatarUpload(input: {
  path: string;
}): Promise<AvatarResult> {
  const user = await requireUser();
  if (!isOwnAvatarPath(user.id, input.path)) {
    return { ok: false, error: "That photo was not found." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "";
    return { ok: false, error: avatarUploadError(message, "Could not save that photo.") };
  }

  const { error: missing } = await admin.storage
    .from(AVATARS_BUCKET)
    .createSignedUrl(input.path, 30);
  if (missing) {
    return {
      ok: false,
      error: avatarUploadError(missing.message, "That photo did not finish uploading. Try again."),
    };
  }

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_path: input.path })
    .eq("id", user.id);

  if (updateError) {
    await admin.storage.from(AVATARS_BUCKET).remove([input.path]);
    return {
      ok: false,
      error: isMissingAvatarColumn(updateError.message)
        ? MISSING_AVATARS_SQL
        : updateError.message || "Could not save that photo.",
    };
  }

  const previous = current?.avatar_path?.trim() ?? "";
  if (previous && previous !== input.path) {
    await admin.storage.from(AVATARS_BUCKET).remove([previous]);
  }

  const avatarUrl = avatarPublicUrl(input.path);
  if (!avatarUrl) {
    return { ok: false, error: "Could not save that photo." };
  }

  revalidateProfileSurfaces();
  return { ok: true, avatarUrl };
}
