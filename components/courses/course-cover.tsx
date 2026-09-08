"use client";

import Image from "next/image";

import { courseInitials } from "@/lib/content/catalogue";
import { cn } from "@/lib/utils";

export function CourseCover({
  src,
  title,
  sizes,
  priority = false,
  className,
}: {
  src?: string | null;
  title: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  const image = src?.trim() ?? "";
  return (
    <div className={cn("absolute inset-0 bg-neutral-200", className)}>
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          className="object-cover"
          sizes={sizes}
          priority={priority}
        />
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
