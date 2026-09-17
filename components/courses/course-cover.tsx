"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { courseInitials } from "@/lib/content/catalogue";
import { displayCoverSrc, isLocalPublicAsset } from "@/lib/courses/media";
import { cn } from "@/lib/utils";

export function CourseCover({
  src,
  slug,
  title,
  sizes,
  priority = false,
  className,
}: {
  src?: string | null;
  slug: string;
  title: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const image = displayCoverSrc(slug, src);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [image]);

  const optimize =
    Boolean(image) &&
    !failed &&
    isLocalPublicAsset(image) &&
    !image.startsWith("/api/");

  return (
    <div className={cn("absolute inset-0 bg-neutral-200", className)}>
      {image && !failed ? (
        optimize ? (
          <Image
            src={image}
            alt=""
            fill
            className="object-cover"
            sizes={sizes}
            priority={priority}
            onError={() => setFailed(true)}
          />
        ) : (
          // Signed storage URLs and the cover API redirect are not in next/image remotePatterns.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setFailed(true)}
          />
        )
      ) : (
        <div
          className="flex h-full w-full items-center justify-center"
          aria-hidden="true"
        >
          <span className="select-none text-[1.35rem] font-bold tracking-[0.08em] text-neutral-500">
            {courseInitials(title)}
          </span>
        </div>
      )}
    </div>
  );
}
