"use client";

import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, FileUp, Link2, Trash2 } from "lucide-react";

import {
  attachLessonVideoUrl,
  deleteLessonAsset,
  reorderLessonAssets,
  uploadLessonAsset,
} from "@/lib/courses/asset-actions";
import { classifyUpload, FILE_ACCEPT, isUuid } from "@/lib/courses/media";
import type { LessonAsset } from "@/lib/courses/types";

const KIND_LABEL: Record<LessonAsset["kind"], string> = {
  pdf: "PDF",
  pptx: "PPTX",
  video: "Video",
  youtube: "YouTube",
  vimeo: "Vimeo",
  image: "Image",
  audio: "Audio",
};

export function LessonAssetsEditor({
  lessonId,
  assets,
  onChange,
  hideIds = [],
}: {
  lessonId: string;
  assets?: LessonAsset[];
  onChange: (assets: LessonAsset[]) => void;
  hideIds?: string[];
}) {
  const attached = assets ?? [];
  const hidden = new Set(hideIds);
  const visible = attached.filter((asset) => !hidden.has(asset.id));
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");
  const [pending, setPending] = useState<"upload" | "url" | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const saved = isUuid(lessonId);

  async function apply(
    work: Promise<{ ok: true; assets: LessonAsset[] } | { ok: false; error: string }>
  ) {
    try {
      const result = await work;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      onChange(result.assets);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update lesson media.");
    }
  }

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || pending) return;
    const classified = classifyUpload(file);
    if (!classified.ok) {
      setError(classified.error);
      return;
    }
    setPending("upload");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("title", file.name.replace(/\.[^.]+$/, ""));
      await apply(uploadLessonAsset(lessonId, body));
    } finally {
      setPending(null);
    }
  }

  async function onAttachUrl(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !url.trim()) return;
    setPending("url");
    try {
      await apply(attachLessonVideoUrl(lessonId, url));
      setUrl("");
    } finally {
      setPending(null);
    }
  }

  async function move(visibleIndex: number, direction: -1 | 1) {
    const nextVisible = visibleIndex + direction;
    const asset = visible[visibleIndex];
    const swap = visible[nextVisible];
    if (!asset || !swap || pending) return;
    const ordered = attached.map((item) => item.id);
    const from = ordered.indexOf(asset.id);
    const to = ordered.indexOf(swap.id);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setPending(asset.id);
    try {
      await apply(reorderLessonAssets(lessonId, ordered));
    } finally {
      setPending(null);
    }
  }

  async function remove(asset: LessonAsset) {
    if (pending) return;
    if (!window.confirm("Remove this file from the lesson? The stored file will be deleted.")) {
      return;
    }
    setPending(asset.id);
    try {
      await apply(deleteLessonAsset(asset.id));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mt-6">
      <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
        Lesson media
      </p>
      {!saved ? (
        <p className="mt-2 text-sm text-neutral-400">
          Save this lesson first, then attach files or YouTube/Vimeo URLs.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-neutral-400">
            Images, audio, PDF, and PPTX up to 20 MB. Video files up to 80 MB. PPTX
            downloads only — it is not a slide player.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={FILE_ACCEPT}
              className="sr-only"
              onChange={(event) => void onUpload(event)}
            />
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => fileRef.current?.click()}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-neutral-100 px-4 text-[11px] font-bold tracking-[0.12em] uppercase disabled:opacity-60"
            >
              <FileUp className="size-3.5" />
              {pending === "upload" ? "Uploading…" : "Upload file"}
            </button>
          </div>
          <form onSubmit={(event) => void onAttachUrl(event)} className="mt-3 flex flex-wrap gap-2">
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=… or vimeo.com/…"
              className="h-10 min-w-0 w-full flex-1 rounded-xl border border-neutral-200 px-3 text-sm text-neutral-950 outline-none sm:min-w-[220px]"
            />
            <button
              type="submit"
              disabled={pending !== null || !url.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
            >
              <Link2 className="size-3.5" />
              {pending === "url" ? "Attaching…" : "Attach URL"}
            </button>
          </form>
        </>
      )}

      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {visible.length ? (
        <ul className="mt-4 space-y-2">
          {visible.map((asset, index) => (
            <li
              key={asset.id}
              className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-100 bg-neutral-50 px-3 py-2"
            >
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] text-neutral-500 uppercase">
                {KIND_LABEL[asset.kind]}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-800">
                {asset.title || "Untitled"}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0 || pending !== null}
                  onClick={() => void move(index, -1)}
                  className="flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-white disabled:opacity-30"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === visible.length - 1 || pending !== null}
                  onClick={() => void move(index, 1)}
                  className="flex size-8 items-center justify-center rounded-full text-neutral-400 hover:bg-white disabled:opacity-30"
                >
                  <ChevronDown className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  disabled={pending !== null}
                  onClick={() => void remove(asset)}
                  className="flex size-8 items-center justify-center rounded-full text-red-500 hover:bg-white disabled:opacity-30"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : saved ? (
        <p className="mt-4 text-sm text-neutral-400">
          {hidden.size ? "No extra files attached yet." : "No files attached yet."}
        </p>
      ) : null}
    </div>
  );
}
