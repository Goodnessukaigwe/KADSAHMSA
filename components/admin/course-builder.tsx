"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  ChevronDown,
  Copy,
  GripVertical,
  GraduationCap,
  Italic,
  Link2,
  List,
  Play,
  Plus,
} from "lucide-react";

import { SplitCta } from "@/components/landing/split-cta";
import { CourseLearners } from "@/components/admin/course-learners";
import { FinalQuizEditor } from "@/components/admin/final-quiz-editor";
import { LessonAssetsEditor } from "@/components/admin/lesson-assets-editor";
import {
  createDraftCourse,
  deleteCourse,
  publishSavedCourse,
  saveCourse,
  staffEnrolByEmail,
} from "@/lib/courses/actions";
import { uploadCourseCover } from "@/lib/courses/asset-actions";
import { IMAGE_ACCEPT } from "@/lib/courses/media";
import type {
  AdminCourseDetail,
  BuilderLesson,
  BuilderQuizQuestion,
  CourseLearnerRow,
  CourseNavItem,
  LessonStatus,
} from "@/lib/courses/types";
import { slugFromTitle } from "@/lib/content/admin-builder";
import { cn } from "@/lib/utils";

export function CourseBuilder({
  slug,
  course,
  nav,
  learners = [],
}: {
  slug: string;
  course: AdminCourseDetail | null;
  nav: CourseNavItem[];
  learners?: CourseLearnerRow[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(course?.title ?? "Untitled course");
  const [courseSlug, setCourseSlug] = useState(course?.slug ?? "");
  const [summary, setSummary] = useState(course?.summary ?? "");
  const [durationLabel, setDurationLabel] = useState(course?.durationLabel ?? "");
  const [coverPath, setCoverPath] = useState(course?.coverPath ?? "");
  const [lessons, setLessons] = useState<BuilderLesson[]>(course?.lessons ?? []);
  const [finalQuestions, setFinalQuestions] = useState<BuilderQuizQuestion[]>(
    course?.finalQuestions ?? []
  );
  const [editing, setEditing] = useState<BuilderLesson | null>(null);
  const [saved, setSaved] = useState(true);
  const [pending, setPending] = useState<"save" | "publish" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enrolEmail, setEnrolEmail] = useState("");
  const [enrolMessage, setEnrolMessage] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  const activeLabel =
    nav.find((item) => item.slug === slug)?.label ?? title ?? slug;

  function markDirty() {
    setSaved(false);
    setError(null);
  }

  function openLesson(lesson: BuilderLesson) {
    setEditing({ ...lesson });
  }

  function createModule() {
    const next: BuilderLesson = {
      id: `new-${Date.now()}`,
      title: "Untitled module",
      slug: "untitled-module",
      status: "draft",
      duration: "15 Min",
      introduction: "",
      main: "",
      notes: "",
      assets: [],
    };
    setLessons((current) => [...current, next]);
    setEditing(next);
    markDirty();
  }

  function payload(nextLessons = lessons, nextEditing = editing) {
    const currentLessons = nextEditing
      ? nextLessons.map((item) => (item.id === nextEditing.id ? nextEditing : item))
      : nextLessons;
    return {
      slug,
      title,
      nextSlug: courseSlug || title,
      summary,
      durationLabel,
      coverPath,
      lessons: currentLessons,
      finalQuestions,
    };
  }

  async function persist(
    mode: "save" | "publish",
    nextLessons = lessons,
    nextEditing = editing
  ) {
    if (pending) return;
    setPending(mode);
    setError(null);
    const body = payload(nextLessons, nextEditing);
    const result =
      mode === "publish" ? await publishSavedCourse(body) : await saveCourse(body);
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaved(true);
    if (result.lessons?.length) {
      setLessons(result.lessons);
      if (editing) {
        const match = result.lessons.find(
          (item) => item.id === editing.id || item.slug === editing.slug
        );
        setEditing(
          match
            ? {
                ...match,
                title: editing.title,
                slug: editing.slug,
                duration: editing.duration,
                introduction: editing.introduction,
                main: editing.main,
                notes: editing.notes,
                status: mode === "publish" ? "live" : match.status,
              }
            : editing
        );
      }
    } else if (editing) {
      const next = mode === "publish" ? { ...editing, status: "live" as const } : editing;
      setEditing(next);
      setLessons((current) =>
        current.map((item) => (item.id === next.id ? next : item))
      );
    }
    if (result.slug !== slug) {
      router.replace(`/admin/courses/${result.slug}`);
    }
    router.refresh();
  }

  async function remove() {
    if (pending || slug === "new" || slug === "dptc") return;
    if (!window.confirm("Delete this course? Lessons will be removed. Enrolments block delete.")) {
      return;
    }
    setPending("delete");
    setError(null);
    const result = await deleteCourse(slug);
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin/courses");
    router.refresh();
  }

  async function enrolByEmail(event: React.FormEvent) {
    event.preventDefault();
    if (slug === "new" || enrolling) return;
    setEnrolling(true);
    setEnrolMessage(null);
    const result = await staffEnrolByEmail(enrolEmail, slug);
    setEnrolling(false);
    if (!result.ok) {
      setEnrolMessage(result.error);
      return;
    }
    setEnrolEmail("");
    setEnrolMessage("Learner enrolled.");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start overflow-x-clip">
      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-label="Close course list"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed top-16 bottom-0 left-0 z-40 flex w-[min(248px,85vw)] flex-col rounded-br-[32px] bg-neutral-950 px-4 py-5 text-white transition-transform lg:sticky lg:top-16 lg:z-0 lg:h-[calc(100vh-4rem)] lg:translate-x-0",
          navOpen
            ? "translate-x-0"
            : "pointer-events-none invisible -translate-x-full lg:pointer-events-auto lg:visible lg:translate-x-0"
        )}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/admin/courses"
            className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="Back to catalogue"
            onClick={() => setNavOpen(false)}
          >
            <ArrowLeft className="size-4" />
          </Link>
          <GraduationCap className="size-4" />
          <p className="text-sm font-semibold">Courses</p>
        </div>

        <ul className="mt-6 flex-1 space-y-1 overflow-y-auto">
          {nav.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/admin/courses/${item.slug}`}
                onClick={() => setNavOpen(false)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm",
                  item.slug === slug
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5"
                )}
              >
                <GripVertical className="size-3.5 shrink-0 text-white/35" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <form action={createDraftCourse}>
          <button
            type="submit"
            className="mt-3 flex w-full items-center justify-between rounded-full bg-white/10 px-4 py-2.5 text-[11px] font-bold tracking-[0.12em] uppercase"
          >
            Add new course
            <span className="flex size-7 items-center justify-center rounded-md bg-white text-neutral-950">
              <Plus className="size-3.5" />
            </span>
          </button>
        </form>
      </aside>

      <div className="relative min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-neutral-200 lg:hidden"
                aria-expanded={navOpen}
                onClick={() => setNavOpen((open) => !open)}
              >
                <GraduationCap className="size-4" />
                <span className="sr-only">Open course list</span>
              </button>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Courses</h1>
            </div>
            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              Write lesson copy for {activeLabel}. Attach PDF, PPTX, video, image, or
              audio on a saved lesson. Add a final quiz to issue a certificate.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {slug !== "new" && slug !== "dptc" ? (
              <button
                type="button"
                onClick={() => void remove()}
                disabled={pending === "delete"}
                className="h-9 rounded-full bg-red-50 px-4 text-[11px] font-bold tracking-[0.12em] text-red-700 uppercase disabled:opacity-60"
              >
                {pending === "delete" ? "Deleting…" : "Delete"}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void persist("save")}
              disabled={pending !== null}
              className="h-9 rounded-full bg-neutral-200 px-4 text-[11px] font-bold tracking-[0.12em] uppercase disabled:opacity-60"
            >
              {pending === "save" ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void persist("publish")}
              disabled={pending !== null}
              className="h-9 rounded-full bg-emerald-600 px-4 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
            >
              {pending === "publish" ? "Publishing…" : "Publish"}
            </button>
            <SplitCta icon="plus" size="sm" onClick={createModule}>
              Create new module
            </SplitCta>
          </div>
        </div>

        {error ? (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3 rounded-[24px] bg-white p-5 sm:grid-cols-2">
          <label className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Course title
            <input
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                markDirty();
              }}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-medium tracking-normal text-neutral-950 outline-none"
            />
          </label>
          <label className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Slug
            <input
              value={courseSlug}
              onChange={(event) => {
                setCourseSlug(event.target.value);
                markDirty();
              }}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 font-mono text-[13px] font-normal tracking-normal text-neutral-700 outline-none"
            />
          </label>
          <label className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Duration
            <input
              value={durationLabel}
              onChange={(event) => {
                setDurationLabel(event.target.value);
                markDirty();
              }}
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-normal tracking-normal text-neutral-950 outline-none"
            />
          </label>
          <label className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Cover path or URL
            <input
              value={coverPath}
              onChange={(event) => {
                setCoverPath(event.target.value);
                markDirty();
              }}
              placeholder="https://…"
              className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-normal tracking-normal text-neutral-950 outline-none"
            />
            {course?.id ? (
              <CoverUpload
                courseId={course.id}
                onUploaded={(path) => {
                  setCoverPath(path);
                  setSaved(true);
                }}
              />
            ) : (
              <p className="mt-2 text-[11px] font-normal tracking-normal text-neutral-400 normal-case">
                Save the course first to upload a cover image.
              </p>
            )}
          </label>
          <label className="sm:col-span-2 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
            Summary
            <textarea
              value={summary}
              onChange={(event) => {
                setSummary(event.target.value);
                markDirty();
              }}
              rows={3}
              className="mt-2 w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm font-normal tracking-normal text-neutral-700 outline-none"
            />
          </label>
          <p className="sm:col-span-2 text-sm text-neutral-400">
            Status: {course?.status === "published" ? "Published" : "Draft"}
            {course ? ` · ${course.enrolled} enrolled` : null}
            {saved ? " · Saved" : " · Unsaved"}
          </p>
        </div>

        {slug !== "new" ? (
          <CourseLearners courseSlug={slug} learners={learners} />
        ) : null}

        {slug !== "new" ? (
          <form
            onSubmit={(event) => void enrolByEmail(event)}
            className="mt-4 flex flex-wrap items-end gap-2 rounded-[24px] bg-white p-5"
          >
            <label className="min-w-0 flex-1 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              Enrol by email
              <input
                type="email"
                required
                value={enrolEmail}
                onChange={(event) => setEnrolEmail(event.target.value)}
                placeholder="learner@example.com"
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-medium tracking-normal text-neutral-950 outline-none"
              />
            </label>
            <button
              type="submit"
              disabled={enrolling}
              className="h-11 rounded-full bg-neutral-950 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase disabled:opacity-60"
            >
              {enrolling ? "Enrolling…" : "Enrol"}
            </button>
            {enrolMessage ? (
              <p className="w-full text-sm text-neutral-500">{enrolMessage}</p>
            ) : null}
          </form>
        ) : null}

        <div className="mt-8 overflow-hidden rounded-[24px] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                  <th className="w-8 px-4 py-4">
                    <span className="sr-only">Reorder</span>
                  </th>
                  <th className="px-2 py-4 font-bold">Title</th>
                  <th className="px-2 py-4 font-bold">Status</th>
                  <th className="px-2 py-4 font-bold">Slug</th>
                  <th className="px-2 py-4 font-bold">Duration</th>
                </tr>
              </thead>
              <tbody>
                {lessons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-sm text-neutral-400">
                      No lessons yet. Create a module, then Save.
                    </td>
                  </tr>
                ) : (
                  lessons.map((lesson) => (
                    <tr
                      key={lesson.id}
                      className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                      onClick={() => openLesson(lesson)}
                    >
                      <td className="px-4 py-4 text-neutral-300">
                        <GripVertical className="size-3.5" />
                      </td>
                      <td className="px-2 py-4">
                        <span className="inline-flex items-center gap-2 font-medium">
                          <span className="max-w-[280px] truncate">{lesson.title}</span>
                          <Copy className="size-3 shrink-0 text-neutral-300" />
                        </span>
                      </td>
                      <td className="px-2 py-4">
                        <StatusBadge status={lesson.status} />
                      </td>
                      <td className="max-w-[180px] truncate px-2 py-4 text-neutral-500">
                        {lesson.slug}
                      </td>
                      <td className="px-2 py-4 text-neutral-500">{lesson.duration}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {slug === "dptc" ? (
          <section className="mt-8 rounded-[24px] bg-white p-5">
            <h2 className="text-lg font-bold">Final assessment</h2>
            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              DPTC Module 1 and the certificate assessment stay in the curriculum files.
              Do not re-author them here. Other courses use the question editor on this page.
            </p>
          </section>
        ) : (
          <FinalQuizEditor
            questions={finalQuestions}
            onChange={(next) => {
              setFinalQuestions(next);
              markDirty();
            }}
          />
        )}

        {editing ? (
          <LessonEditor
            lesson={editing}
            saved={saved}
            pending={pending}
            onChange={(next) => {
              setEditing(next);
              setLessons((current) =>
                current.map((item) => (item.id === next.id ? next : item))
              );
              markDirty();
            }}
            onClose={() => setEditing(null)}
            onSave={() => void persist("save")}
            onPublish={() => {
              const live = { ...editing, status: "live" as const };
              const nextLessons = lessons.map((item) =>
                item.id === live.id ? live : item
              );
              setEditing(live);
              setLessons(nextLessons);
              void persist("publish", nextLessons, live);
            }}
            onLinkSlug={() =>
              setEditing({ ...editing, slug: slugFromTitle(editing.title) })
            }
          />
        ) : null}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: LessonStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] uppercase",
        status === "live"
          ? "bg-emerald-100 text-emerald-800"
          : "bg-violet-100 text-violet-800"
      )}
    >
      {status === "live" ? "Live" : "Draft"}
      {status === "live" ? <ChevronDown className="size-3" /> : null}
    </span>
  );
}

function LessonEditor({
  lesson,
  saved,
  pending,
  onChange,
  onClose,
  onSave,
  onPublish,
  onLinkSlug,
}: {
  lesson: BuilderLesson;
  saved: boolean;
  pending: "save" | "publish" | "delete" | null;
  onChange: (lesson: BuilderLesson) => void;
  onClose: () => void;
  onSave: () => void;
  onPublish: () => void;
  onLinkSlug: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 pt-16 backdrop-blur-sm sm:p-4 sm:pt-20">
      <div className="mb-10 grid w-full min-w-0 max-w-5xl gap-6 rounded-[28px] bg-white p-4 shadow-2xl sm:p-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <div className="flex items-start justify-between gap-3">
            <label className="block min-w-0 flex-1 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              Title
              <input
                value={lesson.title}
                onChange={(event) => onChange({ ...lesson, title: event.target.value })}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-base font-semibold tracking-normal text-neutral-950 outline-none focus:border-neutral-400"
              />
            </label>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-neutral-400 hover:text-neutral-950"
            >
              Close
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                Status
              </p>
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...lesson,
                    status: lesson.status === "draft" ? "live" : "draft",
                  })
                }
                className="mt-2"
              >
                <StatusBadge status={lesson.status} />
              </button>
            </div>
            <label className="min-w-0 flex-1 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              Slug
              <input
                value={lesson.slug}
                onChange={(event) => onChange({ ...lesson, slug: event.target.value })}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 font-mono text-[13px] font-normal tracking-normal text-neutral-700 outline-none"
              />
            </label>
            <label className="w-28 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              Duration
              <input
                value={lesson.duration}
                onChange={(event) => onChange({ ...lesson, duration: event.target.value })}
                className="mt-2 h-11 w-full rounded-xl border border-neutral-200 px-3 text-sm font-normal tracking-normal text-neutral-950 outline-none"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={onLinkSlug}
            className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 hover:text-neutral-950"
          >
            <Link2 className="size-3.5" />
            Link to the lesson title
          </button>

          <EditorBlock
            label="Introduction"
            value={lesson.introduction}
            onChange={(introduction) => onChange({ ...lesson, introduction })}
          />
          <EditorBlock
            label="Main content"
            value={lesson.main}
            onChange={(main) => onChange({ ...lesson, main })}
          />
          <EditorBlock
            label="Additional notes"
            value={lesson.notes}
            onChange={(notes) => onChange({ ...lesson, notes })}
          />
          <LessonAssetsEditor
            lessonId={lesson.id}
            assets={lesson.assets ?? []}
            onChange={(assets) => onChange({ ...lesson, assets })}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-sm text-neutral-500">
              <Play className="size-3.5" />
              {saved ? "Saved" : "Unsaved"}
            </p>
            <button
              type="button"
              onClick={onPublish}
              disabled={pending !== null}
              className="h-11 rounded-full bg-emerald-600 px-5 text-[11px] font-bold tracking-[0.14em] text-white uppercase disabled:opacity-60"
            >
              Publish
            </button>
          </div>
          <button
            type="button"
            onClick={onSave}
            disabled={pending !== null}
            className="h-10 rounded-full bg-neutral-100 text-[11px] font-bold tracking-[0.12em] uppercase disabled:opacity-60"
          >
            Save draft
          </button>
          <p className="text-sm text-neutral-400">
            Lesson copy publishes with Save. Files and video URLs attach immediately
            after the lesson exists. Final quiz questions save with the course Save
            button.
          </p>
        </aside>
      </div>
    </div>
  );
}

function CoverUpload({
  courseId,
  onUploaded,
}: {
  courseId: string;
  onUploaded: (path: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || pending) return;
    setPending(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    const result = await uploadCourseCover(courseId, body);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUploaded(result.path);
  }

  return (
    <div className="mt-2">
      <label className="inline-flex h-9 cursor-pointer items-center rounded-full bg-neutral-100 px-3 text-[11px] font-bold tracking-[0.12em] text-neutral-700 uppercase">
        {pending ? "Uploading…" : "Upload cover"}
        <input
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          disabled={pending}
          onChange={(event) => void onChange(event)}
        />
      </label>
      {error ? (
        <p className="mt-2 text-[11px] font-normal tracking-normal text-red-600 normal-case" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function EditorBlock({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mt-6">
      <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
        {label}
      </p>
      <div className="mt-2 overflow-hidden rounded-2xl border border-neutral-200">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-3 py-2 text-neutral-400">
          <Plus className="size-3.5" />
          <span className="text-[11px] font-semibold">Paragraph</span>
          <span className="ml-auto flex items-center gap-2">
            <Link2 className="size-3.5" />
            <Bold className="size-3.5" />
            <Italic className="size-3.5" />
            <List className="size-3.5" />
          </span>
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={5}
          className="w-full resize-y bg-neutral-50 px-3 py-3 text-sm leading-relaxed text-neutral-700 outline-none"
        />
      </div>
    </div>
  );
}
