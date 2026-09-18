export const AVATARS_BUCKET = "avatars";
export const AVATAR_LIMIT_BYTES = 2 * 1024 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";

export const MISSING_AVATARS_SQL =
  "Apply supabase/migrations/20260918100000_profile_avatars.sql before uploading a profile photo.";

const MIME_BY_TYPE: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
};

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function classifyAvatarUpload(file: File):
  | { ok: true; mime: string }
  | { ok: false; error: string } {
  return classifyAvatarMeta(file.name, file.type, file.size);
}

export function classifyAvatarMeta(
  name: string,
  type: string,
  size: number
): { ok: true; mime: string } | { ok: false; error: string } {
  const ext = extensionOf(name);
  const mime = MIME_BY_TYPE[type] ?? MIME_BY_EXT[ext] ?? "";
  if (!mime) {
    return { ok: false, error: "Use a JPEG, PNG, or WebP image." };
  }
  if (size <= 0) {
    return { ok: false, error: "Choose a photo to upload." };
  }
  if (size > AVATAR_LIMIT_BYTES) {
    return { ok: false, error: "That photo is too large. Use an image of about 2 MB or smaller." };
  }
  return { ok: true, mime };
}

export function avatarPublicUrl(path: string | null | undefined): string | null {
  const trimmed = path?.trim() ?? "";
  if (!trimmed) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${AVATARS_BUCKET}/${trimmed.replace(/^\/+/, "")}`;
}

export function isOwnAvatarPath(userId: string, path: string) {
  const prefix = `${userId}/`;
  if (!path.startsWith(prefix)) return false;
  const rest = path.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/") && !rest.includes("..");
}

export function isMissingAvatarColumn(message: string | undefined) {
  if (!message) return false;
  const lower = message.toLowerCase();
  if (!lower.includes("avatar_path")) return false;
  return (
    lower.includes("schema cache") ||
    lower.includes("does not exist") ||
    lower.includes("could not find") ||
    lower.includes("column")
  );
}

export function isMissingAvatarsBucket(message: string | undefined) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return lower.includes("avatars") && (lower.includes("bucket") || lower.includes("not found"));
}

export function avatarUploadError(message: string | undefined, fallback: string) {
  if (isMissingAvatarColumn(message) || isMissingAvatarsBucket(message)) {
    return MISSING_AVATARS_SQL;
  }
  return message || fallback;
}

export function safeAvatarFileName(name: string) {
  const base = name
    .replace(/^.*[\\/]/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/\.(?=.*\.)/g, "-");
  return (base || "avatar").slice(0, 80);
}

function extensionOf(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}
