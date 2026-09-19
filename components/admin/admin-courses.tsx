"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, GripVertical, Plus, Settings2 } from "lucide-react";

import { AdminSearchField } from "@/components/admin/admin-search-field";
import { CourseEditorPanel } from "@/components/admin/course-editor-panel";
import { TabButton } from "@/components/ui/tab-button";
import {
  deleteCourse,
  publishSavedCourse,
  saveAdminCourseColumns,
  setCourseStatus,
  type SaveCourseInput,
} from "@/lib/courses/actions";
import {
  ADMIN_COURSE_COLUMN_POOL,
  type AdminCourseColumn,
  type AdminCourseColumnId,
  type AdminCourseRow,
} from "@/lib/courses/types";
import { cn } from "@/lib/utils";

type Tab = "lessons" | "fields";

type PublishJob = {
  id: number;
  title: string;
  status: "running" | "complete" | "error";
  error?: string;
};

const COLUMN_WIDTH_CLASS: Record<AdminCourseColumnId, string> = {
  title: "w-[22%]",
  status: "w-28",
  slug: "w-36",
  duration: "w-40",
  image00: "w-28",
  image01: "w-28",
  image02: "w-28",
  image03: "w-28",
  image04: "w-28",
  introduction: "w-28",
  main: "w-28",
  notes: "w-28",
};

export function AdminCourses({
  courses,
  initialColumns,
  initialEdit,
}: {
  courses: AdminCourseRow[];
  initialColumns: AdminCourseColumnId[];
  initialEdit: string | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("lessons");
  const [columns, setColumns] = useState(() =>
    initialColumns.map(
      (id) =>
        ADMIN_COURSE_COLUMN_POOL.find((column) => column.id === id) ?? ADMIN_COURSE_COLUMN_POOL[0]
    )
  );
  const [draggedColumn, setDraggedColumn] = useState<AdminCourseColumnId | null>(null);
  const [fieldMenuOpen, setFieldMenuOpen] = useState(false);
  const fieldMenuRef = useRef<HTMLDivElement>(null);
  const [statusPending, setStatusPending] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [deletePending, setDeletePending] = useState(false);
  const [editSlug, setEditSlug] = useState<string | null>(initialEdit);
  const [overlayPhase, setOverlayPhase] = useState<
    "closed" | "entering" | "open" | "exiting-left" | "exiting-right"
  >(() => (initialEdit ? "open" : "closed"));
  const [overlayKey, setOverlayKey] = useState(0);
  const dirtyRef = useRef(false);
  const closeEditorRef = useRef<(options?: { force?: boolean; exit?: "left" | "right" }) => void>(
    () => undefined
  );
  const [publishJob, setPublishJob] = useState<PublishJob | null>(null);
  const publishGen = useRef(0);
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const visibleCourses = useMemo(() => {
    if (!searching) return courses;
    const q = query.trim().toLowerCase();
    return courses.filter(
      (course) =>
        course.title.toLowerCase().includes(q) || course.slug.toLowerCase().includes(q)
    );
  }, [courses, query, searching]);

  useEffect(() => {
    if (overlayPhase !== "entering") return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setOverlayPhase("open"));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [overlayPhase]);

  useEffect(() => {
    if (overlayPhase !== "exiting-left" && overlayPhase !== "exiting-right") {
      return;
    }
    const timer = window.setTimeout(() => {
      setEditSlug(null);
      setOverlayPhase("closed");
      router.refresh();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [overlayPhase, router]);

  useEffect(() => {
    function onPopState() {
      const next = new URLSearchParams(window.location.search).get("edit");
      dirtyRef.current = false;
      if (next) {
        setEditSlug(next);
        setOverlayPhase((phase) =>
          phase === "open" || phase === "entering" ? phase : "entering"
        );
        return;
      }
      setOverlayPhase((phase) =>
        phase === "closed" || phase === "exiting-left" || phase === "exiting-right"
          ? phase
          : "exiting-right"
      );
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (overlayPhase !== "open" && overlayPhase !== "entering") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeEditorRef.current();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [overlayPhase]);

  useEffect(() => {
    if (!fieldMenuOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!fieldMenuRef.current?.contains(event.target as Node)) {
        setFieldMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setFieldMenuOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [fieldMenuOpen]);

  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  function confirmLeave() {
    if (!dirtyRef.current) return true;
    return window.confirm("You have unsaved changes. Leave this course anyway?");
  }

  function writeEditUrl(slug: string | null) {
    const url = slug
      ? `/admin/courses?edit=${encodeURIComponent(slug)}`
      : "/admin/courses";
    window.history.replaceState(null, "", url);
  }

  const overlayVisible =
    overlayPhase === "open" || overlayPhase === "entering";

  function openEditor(slug: string) {
    if (slug === editSlug && overlayVisible) return;
    if (overlayVisible && !confirmLeave()) return;
    dirtyRef.current = false;
    setEditSlug(slug);
    writeEditUrl(slug);
    if (overlayVisible) return;
    setOverlayKey((key) => key + 1);
    setOverlayPhase("entering");
  }

  function closeEditor(options: { force?: boolean; exit?: "left" | "right" } = {}) {
    if (
      overlayPhase === "closed" ||
      overlayPhase === "exiting-left" ||
      overlayPhase === "exiting-right"
    ) {
      return;
    }
    if (!options.force && !confirmLeave()) return;
    dirtyRef.current = false;
    writeEditUrl(null);
    setOverlayPhase(options.exit === "left" ? "exiting-left" : "exiting-right");
  }
  closeEditorRef.current = closeEditor;

  function handleSlugChange(slug: string) {
    setEditSlug(slug);
    writeEditUrl(slug);
  }

  function persistColumns(nextColumns: AdminCourseColumn[]) {
    setColumns(nextColumns);
    void saveAdminCourseColumns(nextColumns.map((column) => column.id));
  }

  function moveColumn(target: AdminCourseColumnId) {
    if (!draggedColumn || draggedColumn === target) return;
    const nextColumns = [...columns];
    const from = nextColumns.findIndex((column) => column.id === draggedColumn);
    const to = nextColumns.findIndex((column) => column.id === target);
    const [moved] = nextColumns.splice(from, 1);
    nextColumns.splice(to, 0, moved);
    persistColumns(nextColumns);
    setDraggedColumn(null);
  }

  const unusedFields = ADMIN_COURSE_COLUMN_POOL.filter(
    (column) => !columns.some((visible) => visible.id === column.id)
  );

  function addField(id: AdminCourseColumnId) {
    if (columns.some((column) => column.id === id)) return;
    const nextColumn = ADMIN_COURSE_COLUMN_POOL.find((column) => column.id === id);
    if (!nextColumn) return;
    persistColumns([...columns, nextColumn]);
    setFieldMenuOpen(false);
  }

  function openFieldMenu() {
    if (unusedFields.length === 0) {
      setFieldMenuOpen(false);
      return;
    }
    setFieldMenuOpen((open) => !open);
  }

  async function updateStatus(course: AdminCourseRow, next: "draft" | "published") {
    if (statusPending) return;
    setStatusPending(course.slug);
    setStatusError(null);
    const result = await setCourseStatus(course.slug, next);
    if (!result.ok) {
      setStatusError(result.error);
    } else {
      router.refresh();
    }
    setStatusPending(null);
  }

  function toggleSelected(slug: string, checked: boolean) {
    setSelectedSlugs((current) => {
      if (checked) return current.includes(slug) ? current : [...current, slug];
      return current.filter((item) => item !== slug);
    });
  }

  async function removeSelected() {
    const slugs = selectedSlugs;
    if (!slugs.length || deletePending) return;
    if (
      !window.confirm(
        slugs.length === 1
          ? "Delete this course? Lessons, enrolments, progress, and related records will be removed."
          : "Delete these courses? Lessons, enrolments, progress, and related records will be removed."
      )
    ) {
      return;
    }
    setDeletePending(true);
    setStatusError(null);
    const failures: string[] = [];
    const succeeded: string[] = [];
    try {
      for (const slug of slugs) {
        try {
          const result = await deleteCourse(slug);
          if (result.ok) succeeded.push(slug);
          else failures.push(`${slug}: ${result.error}`);
        } catch (error) {
          failures.push(
            `${slug}: ${error instanceof Error ? error.message : "Could not delete this course."}`
          );
        }
      }
    } finally {
      setSelectedSlugs((current) => current.filter((slug) => !succeeded.includes(slug)));
      if (failures.length) setStatusError(failures.join(" "));
      setDeletePending(false);
      if (succeeded.length) router.refresh();
    }
  }

  function startPublish(input: SaveCourseInput) {
    const id = ++publishGen.current;
    const title = input.title.trim() || "Untitled course";
    setPublishJob({ id, title, status: "running" });
    void (async () => {
      try {
        const result = await publishSavedCourse(input);
        if (publishGen.current !== id) return;
        if (!result.ok) {
          setPublishJob({ id, title, status: "error", error: result.error });
          return;
        }
        setPublishJob({ id, title, status: "complete" });
        router.refresh();
        window.setTimeout(() => {
          setPublishJob((current) => (current?.id === id ? null : current));
        }, 1600);
      } catch (error) {
        if (publishGen.current !== id) return;
        setPublishJob({
          id,
          title,
          status: "error",
          error: error instanceof Error ? error.message : "Could not publish this course.",
        });
      }
    })();
  }

  const overlayActive = overlayPhase !== "closed";

  return (
    <div className="relative pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Courses</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Search, manage access, and approve organization accounts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {selectedSlugs.length > 0 ? (
            <button
              type="button"
              onClick={() => void removeSelected()}
              disabled={deletePending}
              className="text-[11px] font-bold tracking-[0.12em] text-red-600 uppercase disabled:opacity-60"
            >
              {deletePending ? "Deleting…" : "Delete"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => openEditor("new")}
            className="inline-flex items-center gap-3 rounded-xl bg-neutral-950 px-4 py-3 text-[10px] font-bold tracking-[0.08em] text-white uppercase"
          >
            Create new course
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-4 border-b border-neutral-200 pb-2">
        <div className="flex min-w-0 items-center gap-2" role="tablist">
          <Settings2 className="size-4 shrink-0 text-neutral-500" />
          <TabButton
            selected={tab === "lessons"}
            onClick={() => setTab("lessons")}
            className="text-xs font-semibold tracking-normal normal-case -mb-2"
          >
            Lessons
          </TabButton>
          <TabButton
            selected={tab === "fields"}
            onClick={() => setTab("fields")}
            className="text-xs font-semibold tracking-normal normal-case -mb-2"
          >
            Fields
          </TabButton>
        </div>
        {tab === "lessons" ? (
          <AdminSearchField
            id="admin-courses-search"
            value={query}
            onChange={setQuery}
            placeholder="Search courses..."
            label="Search courses"
            className="ml-auto w-[min(100%,280px)] shrink-0"
          />
        ) : null}
      </div>

      {publishJob ? <PublishProgress job={publishJob} onDismiss={() => setPublishJob(null)} /> : null}

      {statusError ? (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {statusError}
        </p>
      ) : null}

      {tab === "fields" ? (
        <div className="mt-6">
          <FieldList
            columns={columns}
            draggedColumn={draggedColumn}
            onDragStart={setDraggedColumn}
            onDrop={moveColumn}
          />
          <div ref={fieldMenuRef} className="relative mt-4 inline-block">
            {fieldMenuOpen && unusedFields.length > 0 ? (
              <div
                role="menu"
                aria-label="Unused fields"
                className="absolute bottom-full left-0 z-20 mb-2 min-w-56 rounded-xl border border-neutral-200 bg-white p-1 shadow-xl"
              >
                {unusedFields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    role="menuitem"
                    onClick={() => addField(field.id)}
                    className="flex w-full rounded-lg px-3 py-2 text-left text-xs text-neutral-700 hover:bg-neutral-100"
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              disabled={unusedFields.length === 0}
              aria-haspopup="menu"
              aria-expanded={fieldMenuOpen}
              onClick={openFieldMenu}
              className="inline-flex items-center gap-3 rounded-xl bg-neutral-950 px-4 py-3 text-[10px] font-bold tracking-[0.08em] text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add new field
              <span className="flex size-6 items-center justify-center rounded-md bg-white text-neutral-950">
                <Plus className="size-3.5" />
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
          <table className="w-full min-w-[54rem] table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-neutral-100 text-[9px] font-bold tracking-[0.12em] text-neutral-400 uppercase">
                <th className="w-14 px-4 py-4" aria-label="Select and reorder" />
                {columns.map((column) => (
                  <th
                    key={column.id}
                    className={cn(
                      COLUMN_WIDTH_CLASS[column.id],
                      "overflow-hidden px-4 py-4 whitespace-nowrap"
                    )}
                  >
                    {/* width from COLUMN_WIDTH_CLASS */}
                    {column.label}
                  </th>
                ))}
                <th className="w-16 px-4 py-4" aria-label="Edit" />
              </tr>
            </thead>
            <tbody>
              {visibleCourses.map((course) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  columns={columns.map((column) => column.id)}
                  pending={statusPending === course.slug}
                  selected={selectedSlugs.includes(course.slug)}
                  onSelectedChange={(checked) => toggleSelected(course.slug, checked)}
                  onOpen={() => openEditor(course.slug)}
                  onStatusChange={(next) => void updateStatus(course, next)}
                />
              ))}
            </tbody>
          </table>
          {courses.length === 0 ? (
            <p className="px-5 py-10 text-sm text-neutral-400">No courses yet.</p>
          ) : visibleCourses.length === 0 ? (
            <p className="px-5 py-10 text-sm text-neutral-400">No courses match your search.</p>
          ) : null}
        </div>
      )}

      <div
        className={cn(
          "fixed top-16 right-0 bottom-0 left-0 z-20 bg-neutral-950/40 transition-opacity duration-500 ease-out lg:left-[calc(220px+2rem)]",
          overlayVisible ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        aria-hidden={!overlayVisible}
        onClick={() => closeEditor()}
      />

      {overlayActive && editSlug ? (
        <div
          key={overlayKey}
          role="dialog"
          aria-modal="true"
          aria-label="Course editor"
          className={cn(
            "fixed top-16 right-0 bottom-0 left-0 z-30 w-auto overflow-y-auto bg-[#f7f7f7] lg:left-[calc(220px+2rem)]",
            overlayPhase !== "entering" && "transition-transform duration-500 ease-out",
            overlayPhase === "open"
              ? "translate-x-0"
              : overlayPhase === "exiting-left"
                ? "-translate-x-full"
                : "translate-x-full",
            (overlayPhase === "exiting-left" || overlayPhase === "exiting-right") &&
              "pointer-events-none"
          )}
        >
          <div className="min-h-full w-full px-4 py-6 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => closeEditor()}
              className="outline-control mb-4 inline-flex size-10 items-center justify-center rounded-full text-neutral-800 shadow-sm"
              aria-label="Back to courses"
            >
              <ArrowLeft className="size-4" />
            </button>
            <CourseEditorPanel
              slug={editSlug}
              onClose={closeEditor}
              onSlugChange={handleSlugChange}
              onDirtyChange={setDirty}
              onPublish={startPublish}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PublishProgress({
  job,
  onDismiss,
}: {
  job: PublishJob;
  onDismiss: () => void;
}) {
  const running = job.status === "running";
  const failed = job.status === "error";
  return (
    <div
      className="sticky top-16 z-10 mt-6 rounded-xl border border-neutral-200 bg-white px-4 py-3 shadow-sm"
      role="status"
      aria-live="polite"
      aria-busy={running || undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-neutral-900">
          {running
            ? `Publishing ${job.title}…`
            : failed
              ? `Could not publish ${job.title}.`
              : `${job.title} is published.`}
        </p>
        {failed ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] font-bold tracking-[0.12em] text-neutral-500 uppercase hover:text-neutral-950"
          >
            Dismiss
          </button>
        ) : null}
      </div>
      {failed ? (
        <p className="mt-1 text-sm text-red-600">{job.error}</p>
      ) : (
        <div
          className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100"
          role="progressbar"
          aria-label={running ? `Publishing ${job.title}` : `${job.title} published`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={running ? undefined : 100}
        >
          <div
            className={cn(
              "h-full rounded-full bg-emerald-500",
              running ? "w-1/3 animate-pulse" : "w-full"
            )}
          />
        </div>
      )}
    </div>
  );
}

function FieldList({
  columns,
  draggedColumn,
  onDragStart,
  onDrop,
}: {
  columns: AdminCourseColumn[];
  draggedColumn: AdminCourseColumnId | null;
  onDragStart: (id: AdminCourseColumnId) => void;
  onDrop: (id: AdminCourseColumnId) => void;
}) {
  return (
    <ul className="space-y-1 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2">
      {columns.map((column) => (
        <li
          key={column.id}
          draggable
          onDragStart={() => onDragStart(column.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => onDrop(column.id)}
          className={cn(
            "flex cursor-grab items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-700",
            draggedColumn === column.id && "bg-neutral-100 opacity-50"
          )}
        >
          <GripVertical className="size-3.5 text-neutral-300" />
          {column.label}
        </li>
      ))}
    </ul>
  );
}

function CourseRow({
  course,
  columns,
  pending,
  selected,
  onSelectedChange,
  onOpen,
  onStatusChange,
}: {
  course: AdminCourseRow;
  columns: AdminCourseColumnId[];
  pending: boolean;
  selected: boolean;
  onSelectedChange: (checked: boolean) => void;
  onOpen: () => void;
  onStatusChange: (status: "draft" | "published") => void;
}) {
  return (
    <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <GripVertical className="size-3.5 text-neutral-300" />
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectedChange(event.target.checked)}
            aria-label={`Select ${course.title}`}
            className="accent-neutral-950 disabled:cursor-not-allowed disabled:opacity-40"
          />
        </div>
      </td>
      {columns.map((column) => (
        <td
          key={column}
          className={cn(
            COLUMN_WIDTH_CLASS[column],
            "min-w-0 overflow-hidden px-4 py-4 text-xs text-neutral-500"
          )}
        >
          <CourseCell
            column={column}
            course={course}
            pending={pending}
            onOpen={onOpen}
            onStatusChange={onStatusChange}
          />
        </td>
      ))}
      <td className="px-4 py-4">
        <button
          type="button"
          onClick={onOpen}
          className="text-[10px] font-bold uppercase hover:underline"
        >
          Edit
        </button>
      </td>
    </tr>
  );
}

function CourseCell({
  column,
  course,
  pending,
  onOpen,
  onStatusChange,
}: {
  column: AdminCourseColumnId;
  course: AdminCourseRow;
  pending: boolean;
  onOpen: () => void;
  onStatusChange: (status: "draft" | "published") => void;
}) {
  switch (column) {
    case "title":
      return (
        <button
          type="button"
          onClick={onOpen}
          title={course.title}
          className="block w-full min-w-0 truncate text-left font-medium text-neutral-900 hover:underline"
        >
          {course.title}
        </button>
      );
    case "status":
      return <StatusMenu status={course.status} pending={pending} onChange={onStatusChange} />;
    case "slug":
      return (
        <span className="block min-w-0 truncate font-mono text-[10px]" title={course.slug}>
          {course.slug}
        </span>
      );
    case "duration":
      return (
        <span className="block min-w-0 truncate" title={course.duration || undefined}>
          {course.duration || "--"}
        </span>
      );
    case "image00":
      return <MediaReference value={course.image ? "Cover image" : "Cover Photo"} />;
    case "image01":
      return <MediaReference value={course.image01 || "Photo 1"} />;
    case "image02":
      return <MediaReference value={course.image02 || "Photo 2"} />;
    case "image03":
      return <MediaReference value={course.image03 || "Photo 3"} />;
    case "image04":
      return <MediaReference value={course.image04 || "Photo 4"} />;
    case "introduction":
      return <MediaReference value={course.introduction || "Introduction"} />;
    case "main":
      return <MediaReference value={course.main || "Main Content"} />;
    case "notes":
      return <MediaReference value={course.notes || "Additional Notes"} />;
  }
}

function StatusMenu({
  status,
  pending,
  onChange,
}: {
  status: "draft" | "published";
  pending: boolean;
  onChange: (status: "draft" | "published") => void;
}) {
  const [open, setOpen] = useState(false);
  const live = status === "published";
  return (
    <div className="relative inline-block">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold",
          live ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"
        )}
      >
        {pending ? "Saving..." : live ? "Live" : "Draft"}
        <ChevronDown className="size-3" />
      </button>
      {open ? (
        <div className="absolute top-8 left-0 z-20 w-28 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onChange("draft");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-neutral-100"
          >
            <span className="size-2 rounded-full bg-violet-400" />
            Draft
            {status === "draft" ? <Check className="ml-auto size-3" /> : null}
          </button>
          <button
            type="button"
            onClick={() => {
              onChange("published");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-neutral-100"
          >
            <span className="size-2 rounded-full bg-emerald-400" />
            Live
            {live ? <Check className="ml-auto size-3" /> : null}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function MediaReference({ value }: { value: string }) {
  return (
    <span className="block min-w-0 truncate text-[10px] text-neutral-400" title={value}>
      {value}
    </span>
  );
}
