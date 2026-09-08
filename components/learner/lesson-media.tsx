"use client";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";

import { getLessonAssetSignedUrl } from "@/lib/courses/asset-actions";
import { embedSrc, videoIdFromAsset } from "@/lib/courses/media";
import type { LessonAsset } from "@/lib/courses/types";

export function LessonMedia({ assets }: { assets: LessonAsset[] }) {
  if (!assets.length) return null;

  return (
    <section id="lesson-media" className="mt-10 min-w-0 max-w-3xl space-y-6 overflow-x-clip">
      <h2 className="text-lg font-bold text-neutral-950">Lesson media</h2>
      {assets.map((asset) => (
        <LessonAssetBlock key={asset.id} asset={asset} />
      ))}
    </section>
  );
}

function LessonAssetBlock({ asset }: { asset: LessonAsset }) {
  if (asset.kind === "youtube" || asset.kind === "vimeo") {
    const id = videoIdFromAsset(asset.kind, asset.externalUrl);
    if (!id) {
      return (
        <p className="text-sm text-neutral-500">
          That video URL could not be shown. Staff should paste a YouTube or Vimeo link.
        </p>
      );
    }
    return (
      <figure>
        {asset.title ? (
          <figcaption className="mb-2 text-sm font-semibold text-neutral-700">
            {asset.title}
          </figcaption>
        ) : null}
        <div className="aspect-video w-full min-w-0 overflow-hidden rounded-2xl bg-neutral-950">
          <iframe
            title={asset.title || (asset.kind === "youtube" ? "YouTube video" : "Vimeo video")}
            src={embedSrc(asset.kind, id)}
            className="size-full max-w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
      </figure>
    );
  }

  return <StoredAsset asset={asset} />;
}

function StoredAsset({ asset }: { asset: LessonAsset }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setPending(true);
    setError(null);
    void getLessonAssetSignedUrl(asset.id).then((result) => {
      if (cancelled) return;
      setPending(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  if (pending) {
    return <p className="text-sm text-neutral-400">Loading {asset.title || "file"}…</p>;
  }
  if (error || !url) {
    return (
      <p className="text-sm text-neutral-500" role="alert">
        {error || "Enrol in this course to open lesson media."}
      </p>
    );
  }

  if (asset.kind === "image") {
    return (
      <figure>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={asset.title || "Lesson image"}
          className="max-h-[32rem] w-full rounded-2xl object-contain bg-neutral-100"
        />
        {asset.title ? (
          <figcaption className="mt-2 text-sm text-neutral-500">{asset.title}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (asset.kind === "audio") {
    return (
      <figure>
        {asset.title ? (
          <figcaption className="mb-2 text-sm font-semibold text-neutral-700">
            {asset.title}
          </figcaption>
        ) : null}
        <audio controls src={url} className="w-full" preload="metadata">
          Your browser cannot play this audio.
        </audio>
      </figure>
    );
  }

  if (asset.kind === "video") {
    return (
      <figure>
        {asset.title ? (
          <figcaption className="mb-2 text-sm font-semibold text-neutral-700">
            {asset.title}
          </figcaption>
        ) : null}
        <video
          controls
          src={url}
          className="w-full rounded-2xl bg-neutral-950"
          preload="metadata"
        >
          Your browser cannot play this video.
        </video>
      </figure>
    );
  }

  const label = asset.kind === "pptx" ? "Download presentation" : "Open PDF";
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-neutral-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="size-4 shrink-0 text-neutral-500" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{asset.title || label}</p>
          <p className="text-sm text-neutral-500">
            {asset.kind === "pptx"
              ? "PowerPoint file — download only, not a slide player."
              : "PDF"}
          </p>
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        download={asset.kind === "pptx" ? true : undefined}
        className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-neutral-950 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase sm:w-auto"
      >
        <Download className="size-3.5" />
        {label}
      </a>
    </div>
  );
}
