import type { ReactNode } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const COVER_GRAY = "bg-neutral-200";

export function PageHeaderSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div className={className}>
      <Skeleton className="h-9 w-48 sm:h-10 sm:w-64" />
      <Skeleton className="mt-3 h-4 w-full max-w-md" />
    </div>
  );
}

export function StatGridSkeleton({
  count = 4,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-2xl bg-white px-5 py-5">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="mt-3 h-3 w-24" />
        </div>
      ))}
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <article className="flex flex-col">
      <div
        className={cn(
          "relative aspect-[16/10] overflow-hidden rounded-[28px]",
          COVER_GRAY
        )}
      >
        <Skeleton className={cn("size-full rounded-none", COVER_GRAY)} />
      </div>
      <Skeleton className="mt-4 h-5 w-5/6" />
      <Skeleton className="mt-2 h-5 w-2/3" />
      <Skeleton className="mt-2 h-4 w-24" />
      <Skeleton className="mt-4 h-11 w-full rounded-full" />
    </article>
  );
}

export function CourseGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-8 sm:grid-cols-2 xl:grid-cols-3", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <CourseCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function DataTableSkeleton({
  rows = 6,
  cols = 5,
  className,
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-neutral-200 bg-white",
        className
      )}
    >
      <div className="flex gap-4 border-b border-neutral-100 px-4 py-4">
        {Array.from({ length: cols }).map((_, index) => (
          <Skeleton key={index} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className="flex gap-4 border-b border-neutral-100 px-4 py-4 last:border-0"
        >
          {Array.from({ length: cols }).map((_, col) => (
            <Skeleton key={col} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function LessonPlayerSkeleton() {
  return (
    <div className="grid min-w-0 gap-8 overflow-x-clip pb-16 lg:grid-cols-[minmax(0,1fr)_280px]">
      <article className="min-w-0">
        <Skeleton className="h-14 w-full rounded-2xl bg-neutral-900/10" />
        <Skeleton className="mt-8 h-10 w-3/4" />
        <Skeleton className="mt-3 h-4 w-32" />
        <Skeleton className={cn("mt-8 aspect-video w-full rounded-2xl", COVER_GRAY)} />
        <div className="mt-8 max-w-3xl space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </article>
      <aside className="flex min-h-[280px] flex-col gap-6">
        <div className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          <Skeleton className="h-11 rounded-full" />
          <Skeleton className="h-11 rounded-full" />
        </div>
      </aside>
    </div>
  );
}

export function QuizQuestionSkeleton() {
  return (
    <div className="grid min-w-0 gap-8 overflow-x-clip pb-16 lg:grid-cols-[minmax(0,1fr)_240px]">
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="mt-3 flex gap-1.5">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-1.5 flex-1 rounded-full" />
          ))}
        </div>
        <Skeleton className="mt-10 h-8 w-full max-w-3xl" />
        <Skeleton className="mt-2 h-8 w-2/3 max-w-xl" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-full rounded-2xl" />
          ))}
        </div>
        <div className="mt-10 grid grid-cols-2 gap-3">
          <Skeleton className="h-12 rounded-full" />
          <Skeleton className="h-12 rounded-full" />
        </div>
      </div>
      <aside className="flex flex-col gap-6">
        <Skeleton className="h-36 rounded-[24px]" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="size-10 rounded-xl" />
          ))}
        </div>
      </aside>
    </div>
  );
}

export function CourseEditorSkeleton() {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className="min-w-0 flex-1 rounded-[28px] bg-white px-5 py-2 sm:px-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 border-b border-neutral-100 py-4 sm:flex-row sm:items-center sm:gap-4"
          >
            <Skeleton className="h-4 w-20 shrink-0" />
            <Skeleton className="h-11 w-full rounded-full" />
          </div>
        ))}
        <Skeleton className="my-6 h-40 w-full rounded-2xl" />
      </div>
      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-64">
        <Skeleton className="h-10 w-full rounded-full" />
        <Skeleton className="h-10 w-full rounded-full" />
        <div className="rounded-[28px] border border-neutral-200 bg-white px-5 py-6">
          <Skeleton className="mx-auto h-3 w-32" />
          <Skeleton className="mt-4 h-16 w-full rounded-2xl" />
          <Skeleton className="mt-2 h-16 w-full rounded-2xl" />
        </div>
      </aside>
    </div>
  );
}

export function LoadingStatus({ children }: { children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading</span>
      {children}
    </div>
  );
}
