"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, GripVertical, Plus, Settings2 } from "lucide-react";

import { CourseEditorPanel } from "@/components/admin/course-editor-panel";
import { saveAdminCourseColumns, setCourseStatus } from "@/lib/courses/actions";
import {
  ADMIN_COURSE_COLUMN_POOL,
  type AdminCourseColumn,
  type AdminCourseColumnId,
  type AdminCourseRow,
} from "@/lib/courses/types";
import { cn } from "@/lib/utils";

type Tab = "lessons" | "fields";

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
  const [orderedCourses, setOrderedCourses] = useState(courses);
  const [draggedCourse, setDraggedCourse] = useState<string | null>(null);
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
  const [editSlug, setEditSlug] = useState<string | null>(initialEdit);
  const [overlayPhase, setOverlayPhase] = useState<
    "closed" | "entering" | "open" | "exiting-left" | "exiting-right"
  >(() => (initialEdit ? "open" : "closed"));
  const [overlayKey, setOverlayKey] = useState(0);
  const dirtyRef = useRef(false);
  const closeEditorRef = useRef<(options?: { force?: boolean; exit?: "left" | "right" }) => void>(
    () => undefined
  );

  useEffect(() => {
    setOrderedCourses(courses);
  }, [courses]);

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
    setTab("fields");
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

  const overlayActive = overlayPhase !== "closed";

  return (
    <div className="flex h-[calc(100vh-4rem)] items-stretch overflow-hidden">
      <aside className="hidden w-55 shrink-0 self-stretch bg-neutral-950 px-4 py-5 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2 px-2">
          {overlayActive ? (
            <button
              type="button"
              onClick={() => closeEditor()}
              className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="Back to course list"
            >
              <ArrowLeft className="size-4" />
            </button>
          ) : (
            <Link
              href="/admin"
              className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
              aria-label="Back to admin dashboard"
            >
              <ArrowLeft className="size-4" />
            </Link>
          )}
          <span className="text-sm font-semibold">Courses</span>
        </div>
        <SidebarTabs tab={tab} onChange={setTab} />
        {tab === "lessons" ? (
          <ul className="mt-3 flex-1 space-y-1 overflow-y-auto">
            {orderedCourses.map((course) => (
              <li
                key={course.id}
                draggable
                onDragStart={() => setDraggedCourse(course.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!draggedCourse || draggedCourse === course.id) return;
                  setOrderedCourses((current) => {
                    const next = [...current];
                    const from = next.findIndex((item) => item.id === draggedCourse);
                    const to = next.findIndex((item) => item.id === course.id);
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    return next;
                  });
                  setDraggedCourse(null);
                }}
                className={cn(draggedCourse === course.id && "opacity-50")}
              >
                <button
                  type="button"
                  onClick={() => openEditor(course.slug)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white",
                    editSlug === course.slug && "bg-white/10 text-white"
                  )}
                >
                  <GripVertical className="size-3.5 shrink-0 text-white/35" />
                  <span className="truncate">{course.title}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <FieldList
            columns={columns}
            draggedColumn={draggedColumn}
            onDragStart={setDraggedColumn}
            onDrop={moveColumn}
          />
        )}
        <div ref={fieldMenuRef} className="relative mt-4">
          {fieldMenuOpen && unusedFields.length > 0 ? (
            <div
              role="menu"
              aria-label="Unused fields"
              className="absolute inset-x-0 bottom-full z-20 mb-2 rounded-xl border border-white/10 bg-neutral-900 p-1 shadow-xl"
            >
              {unusedFields.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  role="menuitem"
                  onClick={() => addField(field.id)}
                  className="flex w-full rounded-lg px-3 py-2 text-left text-[11px] text-white/80 hover:bg-white/10 hover:text-white"
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
            className="flex w-full items-center justify-between rounded-xl bg-white px-3 py-2.5 text-[10px] font-bold tracking-[0.12em] text-neutral-950 uppercase disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add new field
            <span className="flex size-6 items-center justify-center rounded-md bg-neutral-950 text-white">
              <Plus className="size-3.5" />
            </span>
          </button>
        </div>
      </aside>

      <main className="relative min-w-0 flex-1 overflow-hidden">
        <section className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Courses</h1>
              <p className="mt-1 text-xs text-neutral-400">
                Search, manage access, and approve organization accounts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openEditor("new")}
              className="inline-flex items-center gap-3 rounded-xl bg-neutral-950 px-4 py-3 text-[10px] font-bold tracking-[0.08em] text-white uppercase"
            >
              Create new module
              <Plus className="size-4" />
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2 border-b border-neutral-200 pb-3 lg:hidden">
            <Settings2 className="size-4 text-neutral-500" />
            <button
              type="button"
              onClick={() => setTab("lessons")}
              className={cn("text-xs font-semibold", tab === "lessons" && "text-neutral-950")}
            >
              Lessons
            </button>
            <button
              type="button"
              onClick={() => setTab("fields")}
              className={cn("text-xs font-semibold", tab === "fields" && "text-neutral-950")}
            >
              Fields
            </button>
          </div>

          {statusError ? (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {statusError}
            </p>
          ) : null}

          <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full min-w-215 border-collapse text-left">
              <thead>
                <tr className="border-b border-neutral-100 text-[9px] font-bold tracking-[0.12em] text-neutral-400 uppercase">
                  <th className="w-14 px-4 py-4" aria-label="Select and reorder" />
                  {columns.map((column) => (
                    <th key={column.id} className="whitespace-nowrap px-4 py-4">
                      {column.label}
                    </th>
                  ))}
                  <th className="w-12 px-4 py-4" aria-label="Edit" />
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <CourseRow
                    key={course.id}
                    course={course}
                    columns={columns.map((column) => column.id)}
                    pending={statusPending === course.slug}
                    onOpen={() => openEditor(course.slug)}
                    onStatusChange={(next) => void updateStatus(course, next)}
                  />
                ))}
              </tbody>
            </table>
            {courses.length === 0 ? (
              <p className="px-5 py-10 text-sm text-neutral-400">No courses yet.</p>
            ) : null}
          </div>
        </section>

        <div
          className={cn(
            "absolute inset-0 z-20 bg-neutral-950/40 transition-opacity duration-500 ease-out",
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
              "absolute inset-y-3 right-0 z-30 w-[calc(100%-1.5rem)] max-w-6xl overflow-y-auto rounded-l-2xl bg-[#f7f7f7] shadow-2xl",
              overlayPhase !== "entering" && "transition-transform duration-500 ease-out",
              overlayPhase === "open"
                ? "translate-x-0"
                : overlayPhase === "exiting-left"
                  ? "-translate-x-full"
                  : "translate-x-full"
            )}
          >
            <div className="h-full px-4 py-6 sm:px-6 lg:px-8">
              <CourseEditorPanel
                slug={editSlug}
                onClose={closeEditor}
                onSlugChange={handleSlugChange}
                onDirtyChange={setDirty}
              />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function SidebarTabs({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <div className="mt-7 flex border-b border-white/20 text-[9px] font-bold tracking-[0.14em] uppercase">
      {(["lessons", "fields"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            "w-1/2 border-b-2 px-1 pb-2 text-left",
            tab === item ? "border-white text-white" : "border-transparent text-white/45"
          )}
        >
          {item}
        </button>
      ))}
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
    <ul className="mt-3 flex-1 space-y-1 overflow-y-auto">
      {columns.map((column) => (
        <li
          key={column.id}
          draggable
          onDragStart={() => onDragStart(column.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => onDrop(column.id)}
          className={cn(
            "flex cursor-grab items-center gap-2 rounded-lg px-2 py-2 text-xs text-white/75",
            draggedColumn === column.id && "bg-white/10 opacity-50"
          )}
        >
          <GripVertical className="size-3.5 text-white/35" />
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
  onOpen,
  onStatusChange,
}: {
  course: AdminCourseRow;
  columns: AdminCourseColumnId[];
  pending: boolean;
  onOpen: () => void;
  onStatusChange: (status: "draft" | "published") => void;
}) {
  return (
    <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <GripVertical className="size-3.5 text-neutral-300" />
          <input type="checkbox" aria-label={`Select ${course.title}`} className="accent-neutral-950" />
        </div>
      </td>
      {columns.map((column) => (
        <td key={column} className="max-w-52.5 px-4 py-4 text-xs text-neutral-500">
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
          className="block truncate text-left font-medium text-neutral-900 hover:underline"
        >
          {course.title}
        </button>
      );
    case "status":
      return <StatusMenu status={course.status} pending={pending} onChange={onStatusChange} />;
    case "slug":
      return <span className="block max-w-42.5 truncate font-mono text-[10px]">{course.slug}</span>;
    case "duration":
      return <>{course.duration || "--"}</>;
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
    <span className="block max-w-30 truncate text-[10px] text-neutral-400" title={value}>
      {value}
    </span>
  );
}
