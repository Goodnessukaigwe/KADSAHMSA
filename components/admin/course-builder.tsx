"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bold,
  Camera,
  ChevronDown,
  Copy,
  GripVertical,
  GraduationCap,
  Italic,
  Link2,
  List,
  Pencil,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

import { SplitCta } from "@/components/landing/split-cta";
import {
  builderCourseList,
  courseLabel,
  defaultFields,
  lessonsForCourse,
  slugFromTitle,
  type BuilderLesson,
  type BuilderQuestion,
  type LessonStatus,
} from "@/lib/content/admin-builder";
import { cn } from "@/lib/utils";

export function CourseBuilder({ slug }: { slug: string }) {
  const router = useRouter();
  const [courses, setCourses] = useState(() => {
    const list = builderCourseList();
    if (slug === "new") {
      return [...list, { slug: "new", label: courseLabel("new", list.length) }];
    }
    if (!list.some((course) => course.slug === slug)) {
      return [{ slug, label: courseLabel(slug, 0) }, ...list];
    }
    return list;
  });
  const [activeSlug, setActiveSlug] = useState(slug);
  const [pane, setPane] = useState<"lessons" | "fields">("lessons");
  const [lessons, setLessons] = useState<BuilderLesson[]>(() => lessonsForCourse(slug));
  const [fields, setFields] = useState<string[]>(() => [...defaultFields]);
  const [editing, setEditing] = useState<BuilderLesson | null>(null);
  const [saved, setSaved] = useState(true);
  const [questions, setQuestions] = useState<BuilderQuestion[]>([]);
  const [showAssessment, setShowAssessment] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const activeLabel = courses.find((course) => course.slug === activeSlug)?.label ?? activeSlug;

  function selectCourse(next: string) {
    setActiveSlug(next);
    setLessons(lessonsForCourse(next));
    setEditing(null);
    router.replace(`/admin/courses/${next}`);
  }

  function openLesson(lesson: BuilderLesson) {
    setEditing({ ...lesson });
    setSaved(true);
    setShowAssessment(false);
    setQuestions([]);
    setActiveQuestion(null);
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
    };
    setLessons((current) => [...current, next]);
    openLesson(next);
  }

  function addCourse() {
    const id = `course-${courses.length + 1}`;
    const next = { slug: id, label: `Course ${courses.length + 1}` };
    setCourses((current) => [...current, next]);
    selectCourse(id);
  }

  function saveLesson(next: BuilderLesson) {
    setEditing(next);
    setLessons((current) => current.map((item) => (item.id === next.id ? next : item)));
    setSaved(true);
  }

  function publishLesson() {
    if (!editing) return;
    saveLesson({ ...editing, status: "live" });
    setEditing(null);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start">
      <aside className="sticky top-16 flex h-[calc(100vh-4rem)] w-[248px] shrink-0 flex-col rounded-br-[32px] bg-neutral-950 px-4 py-5 text-white">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/courses"
            className="flex size-8 items-center justify-center rounded-full hover:bg-white/10"
            aria-label="Back to catalogue"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <GraduationCap className="size-4" />
          <p className="text-sm font-semibold">Courses</p>
        </div>

        <div className="mt-6 flex gap-5 border-b border-white/10 px-1">
          {(
            [
              ["lessons", "Lessons"],
              ["fields", "Fields"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPane(id)}
              className={cn(
                "border-b-2 pb-2 text-[11px] font-bold tracking-[0.14em] uppercase",
                pane === id
                  ? "border-white text-white"
                  : "border-transparent text-white/45"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="mt-4 flex-1 space-y-1 overflow-y-auto">
          {pane === "lessons"
            ? courses.map((course) => (
                <li key={course.slug}>
                  <button
                    type="button"
                    onClick={() => selectCourse(course.slug)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm",
                      course.slug === activeSlug
                        ? "bg-white/10 text-white"
                        : "text-white/70 hover:bg-white/5"
                    )}
                  >
                    <GripVertical className="size-3.5 shrink-0 text-white/35" />
                    <span className="truncate">{course.label}</span>
                  </button>
                </li>
              ))
            : fields.map((field) => (
                <li
                  key={field}
                  className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm text-white/80"
                >
                  <GripVertical className="size-3.5 shrink-0 text-white/35" />
                  {field}
                </li>
              ))}
        </ul>

        <button
          type="button"
          onClick={() => {
            if (pane === "fields") {
              setFields((current) => [...current, `New field ${current.length + 1}`]);
              return;
            }
            addCourse();
          }}
          className="mt-3 flex w-full items-center justify-between rounded-full bg-white/10 px-4 py-2.5 text-[11px] font-bold tracking-[0.12em] uppercase"
        >
          {pane === "fields" ? "Add new field" : "Add new course"}
          <span className="flex size-7 items-center justify-center rounded-md bg-white text-neutral-950">
            <Plus className="size-3.5" />
          </span>
        </button>
      </aside>

      <div className="relative min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
            <p className="mt-2 max-w-xl text-sm text-neutral-400">
              Search, manage access, and publish modules for {activeLabel}.
            </p>
          </div>
          <SplitCta icon="plus" size="sm" onClick={createModule}>
            Create new module
          </SplitCta>
        </div>

        <div className="mt-8 overflow-hidden rounded-[24px] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
                  <th className="w-10 px-4 py-4">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="w-8 px-1 py-4">
                    <span className="sr-only">Reorder</span>
                  </th>
                  <th className="px-2 py-4 font-bold">Title</th>
                  <th className="px-2 py-4 font-bold">Status</th>
                  <th className="px-2 py-4 font-bold">Slug</th>
                  <th className="px-2 py-4 font-bold">Duration</th>
                  <th className="px-2 py-4 font-bold">Image 00</th>
                  <th className="px-2 py-4 font-bold">Image 01</th>
                </tr>
              </thead>
              <tbody>
                {lessons.map((lesson) => (
                  <tr
                    key={lesson.id}
                    className="cursor-pointer border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                    onClick={() => openLesson(lesson)}
                  >
                    <td className="px-4 py-4" onClick={(event) => event.stopPropagation()}>
                      <input type="checkbox" className="size-4 accent-neutral-950" />
                    </td>
                    <td className="px-1 py-4 text-neutral-300">
                      <GripVertical className="size-3.5" />
                    </td>
                    <td className="px-2 py-4">
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span className="max-w-[220px] truncate">{lesson.title}</span>
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
                    <td className="px-2 py-4 text-neutral-400">Image 00</td>
                    <td className="px-2 py-4 text-neutral-400">Image 01</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {editing ? (
          <LessonEditor
            lesson={editing}
            saved={saved}
            uploading={uploading}
            showAssessment={showAssessment}
            questions={questions}
            activeQuestion={activeQuestion}
            onChange={(next) => {
              setEditing(next);
              setSaved(false);
            }}
            onClose={() => setEditing(null)}
            onSave={() => saveLesson(editing)}
            onPublish={publishLesson}
            onLinkSlug={() =>
              setEditing({ ...editing, slug: slugFromTitle(editing.title) })
            }
            onUpload={() => {
              setUploading(true);
              window.setTimeout(() => setUploading(false), 1600);
            }}
            onAddAssessment={() => setShowAssessment(true)}
            onAddQuestion={() => {
              const id = `q-${questions.length + 1}`;
              setQuestions((current) => [
                ...current,
                { id, prompt: `Question ${current.length + 1}` },
              ]);
              setActiveQuestion(id);
              setShowAssessment(true);
            }}
            onRemoveQuestion={(id) =>
              setQuestions((current) => current.filter((item) => item.id !== id))
            }
            onSelectQuestion={setActiveQuestion}
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
  uploading,
  showAssessment,
  questions,
  activeQuestion,
  onChange,
  onClose,
  onSave,
  onPublish,
  onLinkSlug,
  onUpload,
  onAddAssessment,
  onAddQuestion,
  onRemoveQuestion,
  onSelectQuestion,
}: {
  lesson: BuilderLesson;
  saved: boolean;
  uploading: boolean;
  showAssessment: boolean;
  questions: BuilderQuestion[];
  activeQuestion: string | null;
  onChange: (lesson: BuilderLesson) => void;
  onClose: () => void;
  onSave: () => void;
  onPublish: () => void;
  onLinkSlug: () => void;
  onUpload: () => void;
  onAddAssessment: () => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (id: string) => void;
  onSelectQuestion: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-20 backdrop-blur-sm">
      <div className="mb-10 grid w-full max-w-5xl gap-6 rounded-[28px] bg-white p-6 shadow-2xl lg:grid-cols-[minmax(0,1fr)_240px]">
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
            Link to the course title
          </button>

          <div className="mt-6">
            <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              Media
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {["Cover photo", "Photo 1", "Photo 2", "Photo 3", "Photo 4"].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={onUpload}
                  className="flex aspect-square flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-400 hover:border-neutral-400"
                >
                  <Camera className="size-5" />
                  <span className="mt-1 px-1 text-center text-[10px] font-semibold uppercase">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

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
              className="h-11 rounded-full bg-emerald-600 px-5 text-[11px] font-bold tracking-[0.14em] text-white uppercase"
            >
              Publish
            </button>
          </div>
          <button
            type="button"
            onClick={onSave}
            className="h-10 rounded-full bg-neutral-100 text-[11px] font-bold tracking-[0.12em] uppercase"
          >
            Save draft
          </button>

          <div className="rounded-2xl border border-neutral-200 p-4">
            <p className="text-[11px] font-bold tracking-[0.14em] text-neutral-400 uppercase">
              Assessment
            </p>
            <p className="mt-2 text-sm text-neutral-500">
              Add an assessment to this lesson by clicking the button below.
            </p>
            {showAssessment ? (
              <ul className="mt-4 space-y-2">
                {questions.map((question, index) => (
                  <li
                    key={question.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
                      activeQuestion === question.id
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-neutral-200"
                    )}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => onSelectQuestion(question.id)}
                    >
                      <p className="font-medium">
                        {index + 1}. {question.prompt}
                      </p>
                      <p className="mt-1 text-[11px] leading-4 text-neutral-400">
                        Option A · Option B · Option C · Option D
                      </p>
                    </button>
                    <Copy className="size-3.5 shrink-0 text-neutral-400" />
                    <button type="button" onClick={() => onRemoveQuestion(question.id)}>
                      <Trash2 className="size-3.5 text-neutral-400" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex flex-col gap-2">
              {!showAssessment ? (
                <button
                  type="button"
                  onClick={onAddAssessment}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-neutral-200 text-[11px] font-bold tracking-[0.12em] uppercase"
                >
                  <Pencil className="size-3.5" />
                  Add assessment
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onAddQuestion}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-neutral-950 text-[11px] font-bold tracking-[0.12em] text-white uppercase"
                  >
                    <Plus className="size-3.5" />
                    Add question
                  </button>
                  <Link
                    href="/learn/dptc/quiz"
                    className="inline-flex h-10 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold tracking-[0.12em] uppercase"
                  >
                    Preview quiz
                  </Link>
                </>
              )}
            </div>
          </div>
        </aside>

        {uploading ? (
          <div className="col-span-full flex items-center gap-3 text-sm text-neutral-500">
            <span className="size-4 animate-spin rounded-full border-2 border-neutral-300 border-t-emerald-500" />
            Uploading image 87%
          </div>
        ) : null}
      </div>
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

