"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText } from "lucide-react";

import { getLessonAssetSignedUrl } from "@/lib/courses/asset-actions";
import { embedSrc, videoIdFromAsset } from "@/lib/courses/media";
import { convertDeckToSlides } from "@/lib/courses/slide-import";
import type { LessonAsset } from "@/lib/courses/types";

const PPTX_MIME =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

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

export function LessonSectionImage({
  asset,
  layout = "default",
}: {
  asset?: LessonAsset;
  layout?: "default" | "wide";
}) {
  if (!asset) return null;
  return (
    <div className={layout === "wide" ? "w-full" : "max-w-3xl"}>
      <LessonAssetBlock asset={asset} layout={layout} />
    </div>
  );
}

export function LessonSectionMedia({
  assets,
  layout = "default",
}: {
  assets: LessonAsset[];
  layout?: "default" | "wide";
}) {
  if (!assets.length) return null;
  return (
    <div className={layout === "wide" ? "w-full space-y-6" : "max-w-3xl space-y-6"}>
      {assets.map((asset) => (
        <LessonAssetBlock key={asset.id} asset={asset} layout={layout} />
      ))}
    </div>
  );
}

export function LessonAssetBlock({
  asset,
  layout = "default",
}: {
  asset: LessonAsset;
  layout?: "default" | "wide";
}) {
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

  return <StoredAsset asset={asset} layout={layout} />;
}

function StoredAsset({
  asset,
  layout = "default",
}: {
  asset: LessonAsset;
  layout?: "default" | "wide";
}) {
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
          className={
            layout === "wide"
              ? "max-h-[min(80vh,56rem)] w-full rounded-2xl bg-neutral-950 object-contain"
              : "max-h-[32rem] w-full rounded-2xl bg-neutral-100 object-contain"
          }
        />
        {layout === "wide" || !asset.title ? null : (
          <figcaption className="mt-2 text-sm text-neutral-500">{asset.title}</figcaption>
        )}
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

  if (asset.kind === "pptx" || asset.kind === "pdf") {
    return <InlineDeck asset={asset} url={url} layout={layout} />;
  }

  return <DownloadCard asset={asset} url={url} />;
}

/**
 * Renders a stored PPTX or PDF inline as slide images using the same
 * in-browser rasterizer as the admin import (pptx-browser / pdfjs-dist).
 * Falls back to the download card only if conversion fails.
 */
function InlineDeck({
  asset,
  url,
  layout = "default",
}: {
  asset: LessonAsset;
  url: string;
  layout?: "default" | "wide";
}) {
  const [slides, setSlides] = useState<string[] | null>(null);
  const [failed, setFailed] = useState(false);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    setSlides(null);
    setFailed(false);

    async function run() {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not load that file.");
      const blob = await response.blob();
      const file = new File(
        [blob],
        asset.kind === "pptx" ? "slides.pptx" : "document.pdf",
        { type: asset.kind === "pptx" ? PPTX_MIME : "application/pdf" }
      );
      const converted = await convertDeckToSlides(file);
      if (!converted.ok || !converted.slides.length) {
        throw new Error(converted.ok ? "Empty file." : converted.error);
      }
      const urls = converted.slides.map((slide) => URL.createObjectURL(slide.image));
      if (cancelled) {
        for (const item of urls) URL.revokeObjectURL(item);
        return;
      }
      objectUrls.current = urls;
      setSlides(urls);
    }

    run().catch(() => {
      if (!cancelled) setFailed(true);
    });

    return () => {
      cancelled = true;
      for (const item of objectUrls.current) URL.revokeObjectURL(item);
      objectUrls.current = [];
    };
  }, [url, asset.kind]);

  if (failed) {
    return <DownloadCard asset={asset} url={url} />;
  }
  if (!slides) {
    return (
      <p className="text-sm text-neutral-400">
        Preparing {asset.title || (asset.kind === "pptx" ? "slides" : "PDF")}…
      </p>
    );
  }

  const imageClassName =
    layout === "wide"
      ? "max-h-[min(80vh,56rem)] w-full rounded-2xl bg-neutral-950 object-contain"
      : "max-h-[32rem] w-full rounded-2xl bg-neutral-100 object-contain";
  return (
    <figure className="space-y-4">
      {layout !== "wide" && asset.title ? (
        <figcaption className="text-sm font-semibold text-neutral-700">
          {asset.title}
        </figcaption>
      ) : null}
      {slides.map((src, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={src}
          src={src}
          alt={`${asset.title || "Lesson slides"} — slide ${index + 1} of ${slides.length}`}
          className={imageClassName}
        />
      ))}
      <p className="text-sm text-neutral-500">
        <a href={url} target="_blank" rel="noreferrer" className="underline">
          {asset.kind === "pptx" ? "Download the original presentation" : "Open the original PDF"}
        </a>
      </p>
    </figure>
  );
}

function DownloadCard({ asset, url }: { asset: LessonAsset; url: string }) {
  const label = asset.kind === "pptx" ? "Download presentation" : "Open PDF";
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-2xl bg-neutral-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="size-4 shrink-0 text-neutral-500" />
        <div className="min-w-0">
          <p className="truncate font-semibold">{asset.title || label}</p>
          <p className="text-sm text-neutral-500">
            {asset.kind === "pptx" ? "PowerPoint file" : "PDF"}
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

/**
 * Small secondary download link for original deck files whose slides are
 * already rendered inline as images — never a "download to view" prompt.
 */
export function LessonAssetLink({ asset }: { asset: LessonAsset }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getLessonAssetSignedUrl(asset.id).then((result) => {
      if (!cancelled && result.ok) setUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  if (!url) return null;
  return (
    <p className="text-sm text-neutral-500">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        download={asset.kind === "pptx" ? true : undefined}
        className="inline-flex items-center gap-1.5 underline"
      >
        <Download className="size-3.5" />
        {asset.title || "Original file"}
        {asset.kind === "pptx" ? " (PowerPoint)" : asset.kind === "pdf" ? " (PDF)" : ""}
      </a>
    </p>
  );
}
