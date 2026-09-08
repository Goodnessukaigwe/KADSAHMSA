import type { LessonAssetKind } from "@/lib/courses/types";

export const COURSE_MEDIA_BUCKET = "course-media";

export const FILE_LIMIT_BYTES = 20 * 1024 * 1024;
export const VIDEO_LIMIT_BYTES = 80 * 1024 * 1024;

export const MISSING_ASSETS_SQL =
  "Apply supabase/apply-phase6.sql before attaching lesson media.";

type FileKind = "pdf" | "pptx" | "video" | "image" | "audio";

const MIME_RULES: Record<string, { kind: FileKind; maxBytes: number }> = {
  "application/pdf": { kind: "pdf", maxBytes: FILE_LIMIT_BYTES },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    kind: "pptx",
    maxBytes: FILE_LIMIT_BYTES,
  },
  "image/jpeg": { kind: "image", maxBytes: FILE_LIMIT_BYTES },
  "image/png": { kind: "image", maxBytes: FILE_LIMIT_BYTES },
  "image/webp": { kind: "image", maxBytes: FILE_LIMIT_BYTES },
  "image/gif": { kind: "image", maxBytes: FILE_LIMIT_BYTES },
  "audio/mpeg": { kind: "audio", maxBytes: FILE_LIMIT_BYTES },
  "audio/mp3": { kind: "audio", maxBytes: FILE_LIMIT_BYTES },
  "audio/wav": { kind: "audio", maxBytes: FILE_LIMIT_BYTES },
  "audio/x-wav": { kind: "audio", maxBytes: FILE_LIMIT_BYTES },
  "audio/ogg": { kind: "audio", maxBytes: FILE_LIMIT_BYTES },
  "audio/webm": { kind: "audio", maxBytes: FILE_LIMIT_BYTES },
  "audio/mp4": { kind: "audio", maxBytes: FILE_LIMIT_BYTES },
  "video/mp4": { kind: "video", maxBytes: VIDEO_LIMIT_BYTES },
  "video/webm": { kind: "video", maxBytes: VIDEO_LIMIT_BYTES },
  "video/quicktime": { kind: "video", maxBytes: VIDEO_LIMIT_BYTES },
};

const EXT_RULES: Record<string, { kind: FileKind; mime: string; maxBytes: number }> = {
  pdf: { kind: "pdf", mime: "application/pdf", maxBytes: FILE_LIMIT_BYTES },
  pptx: {
    kind: "pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    maxBytes: FILE_LIMIT_BYTES,
  },
  jpg: { kind: "image", mime: "image/jpeg", maxBytes: FILE_LIMIT_BYTES },
  jpeg: { kind: "image", mime: "image/jpeg", maxBytes: FILE_LIMIT_BYTES },
  png: { kind: "image", mime: "image/png", maxBytes: FILE_LIMIT_BYTES },
  webp: { kind: "image", mime: "image/webp", maxBytes: FILE_LIMIT_BYTES },
  gif: { kind: "image", mime: "image/gif", maxBytes: FILE_LIMIT_BYTES },
  mp3: { kind: "audio", mime: "audio/mpeg", maxBytes: FILE_LIMIT_BYTES },
  wav: { kind: "audio", mime: "audio/wav", maxBytes: FILE_LIMIT_BYTES },
  ogg: { kind: "audio", mime: "audio/ogg", maxBytes: FILE_LIMIT_BYTES },
  m4a: { kind: "audio", mime: "audio/mp4", maxBytes: FILE_LIMIT_BYTES },
  mp4: { kind: "video", mime: "video/mp4", maxBytes: VIDEO_LIMIT_BYTES },
  webm: { kind: "video", mime: "video/webm", maxBytes: VIDEO_LIMIT_BYTES },
  mov: { kind: "video", mime: "video/quicktime", maxBytes: VIDEO_LIMIT_BYTES },
};

export const FILE_ACCEPT =
  ".pdf,.pptx,.jpg,.jpeg,.png,.webp,.gif,.mp3,.wav,.ogg,.m4a,.mp4,.webm,.mov";

export const IMAGE_ACCEPT = ".jpg,.jpeg,.png,.webp,.gif";

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function isMissingAssetsRelation(message: string | undefined) {
  if (!message) return false;
  return message.includes("lesson_assets") || message.includes("schema cache");
}

export function safeFileName(name: string) {
  const base = name
    .replace(/^.*[\\/]/, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/\.(?=.*\.)/g, "-");
  return (base || "file").slice(0, 80);
}

export function isStockLandingCover(path: string) {
  return path.trim().startsWith("/landing/");
}

export function coverForSlug(_slug: string, coverPath?: string | null) {
  const trimmed = coverPath?.trim() ?? "";
  if (!trimmed || isStockLandingCover(trimmed)) return "";
  return trimmed;
}

export function isPublicCoverPath(path: string) {
  return path.startsWith("/") || /^https?:\/\//i.test(path);
}

function extensionOf(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? "";
}

export function classifyUpload(file: File):
  | { ok: true; kind: FileKind; mime: string }
  | { ok: false; error: string } {
  const ext = extensionOf(file.name);
  const byMime = MIME_RULES[file.type];
  const byExt = EXT_RULES[ext];
  const rule = byMime ?? (byExt ? { kind: byExt.kind, maxBytes: byExt.maxBytes } : null);
  if (!rule) {
    return {
      ok: false,
      error:
        "That file type is not allowed. Use PDF, PPTX, an image, audio, or MP4/WebM video.",
    };
  }
  if (file.size <= 0) {
    return { ok: false, error: "Choose a file to upload." };
  }
  if (file.size > rule.maxBytes) {
    return {
      ok: false,
      error:
        rule.kind === "video"
          ? "That video is too large. Video files must be 80 MB or smaller."
          : "That file is too large. Images, audio, PDF, and PPTX must be 20 MB or smaller.",
    };
  }
  return {
    ok: true,
    kind: rule.kind,
    mime: byMime ? file.type : (byExt?.mime ?? file.type),
  };
}

export function classifyImageUpload(file: File):
  | { ok: true; mime: string }
  | { ok: false; error: string } {
  const classified = classifyUpload(file);
  if (!classified.ok) return classified;
  if (classified.kind !== "image") {
    return { ok: false, error: "Cover photos must be a JPEG, PNG, WebP, or GIF." };
  }
  return { ok: true, mime: classified.mime };
}

export type ParsedVideoUrl =
  | { kind: "youtube"; id: string; url: string }
  | { kind: "vimeo"; id: string; url: string };

export function parseVideoUrl(raw: string): ParsedVideoUrl | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return youtubeResult(id);
  }
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      return youtubeResult(url.searchParams.get("v") ?? "");
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (
      (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") &&
      parts[1]
    ) {
      return youtubeResult(parts[1]);
    }
  }

  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts[0] === "video" ? (parts[1] ?? "") : (parts[0] ?? "");
    return vimeoResult(id);
  }

  return null;
}

function youtubeResult(id: string): ParsedVideoUrl | null {
  const clean = id.replace(/[^a-zA-Z0-9_-]/g, "");
  if (clean.length < 11) return null;
  return {
    kind: "youtube",
    id: clean.slice(0, 11),
    url: `https://www.youtube.com/watch?v=${clean.slice(0, 11)}`,
  };
}

function vimeoResult(id: string): ParsedVideoUrl | null {
  const clean = id.replace(/\D/g, "");
  if (clean.length < 6 || clean.length > 12) return null;
  return {
    kind: "vimeo",
    id: clean,
    url: `https://vimeo.com/${clean}`,
  };
}

export function embedSrc(kind: Extract<LessonAssetKind, "youtube" | "vimeo">, id: string) {
  if (kind === "youtube") {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`;
  }
  return `https://player.vimeo.com/video/${encodeURIComponent(id)}`;
}

export function videoIdFromAsset(kind: LessonAssetKind, externalUrl: string | null) {
  if ((kind !== "youtube" && kind !== "vimeo") || !externalUrl) return null;
  const parsed = parseVideoUrl(externalUrl);
  if (!parsed || parsed.kind !== kind) return null;
  return parsed.id;
}
