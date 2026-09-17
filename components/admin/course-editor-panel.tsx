"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Copy,
  FileText,
  Film,
  Italic,
  Link2,
  List,
  Play,
  Plus,
  Trash2,
} from "lucide-react";

import { FinalQuizEditor } from "@/components/admin/final-quiz-editor";
import { LessonAssetsEditor } from "@/components/admin/lesson-assets-editor";
import { slugFromTitle } from "@/lib/content/admin-builder";
import {
  deleteCourse,
  loadAdminCourse,
  previewCoverPath,
  publishSavedCourse,
  saveCourse,
  setCourseStatus,
} from "@/lib/courses/actions";
import {
  getLessonAssetSignedUrl,
  uploadCourseCover,
  uploadLessonAsset,
} from "@/lib/courses/asset-actions";
import { IMAGE_ACCEPT, PDF_ACCEPT, VIDEO_ACCEPT, isPublicCoverPath, isUuid } from "@/lib/courses/media";
import {
  joinLessonParagraphs,
  normalizeLinkUrl,
  splitLessonParagraphs,
  toEditableHtml,
} from "@/lib/courses/rich-text";
import type {
  AdminCourseDetail,
  BuilderLesson,
  BuilderQuizQuestion,
  CourseStatus,
  LessonAsset,
  LessonAssetSection,
  SectionedAssetKind,
} from "@/lib/courses/types";
import {
  LESSON_ASSET_SECTIONS,
  sectionedLessonAsset,
} from "@/lib/courses/types";
import { cn } from "@/lib/utils";

type StagedFile = { file: File; previewUrl: string };
type StagedSectionFiles = Partial<
  Record<string, Partial<Record<LessonAssetSection, Partial<Record<SectionedAssetKind, StagedFile>>>>>
>;
const SECTION_MEDIA_KINDS: SectionedAssetKind[] = ["image", "video", "pdf"];

function revokeStaged(staged: StagedFile | null | undefined) {
  if (staged?.previewUrl.startsWith("blob:")) URL.revokeObjectURL(staged.previewUrl);
}

function revokeSectionFiles(staged: StagedSectionFiles) {
  for (const lesson of Object.values(staged)) {
    if (!lesson) continue;
    for (const files of Object.values(lesson)) {
      if (!files) continue;
      for (const file of Object.values(files)) revokeStaged(file);
    }
  }
}

function stagedPreview(file: File, kind: SectionedAssetKind) {
  return kind === "image" ? URL.createObjectURL(file) : "";
}

function blankLesson(): BuilderLesson {
  return {
    id: `new-${Date.now()}`,
    title: "Untitled module",
    slug: "untitled-module",
    status: "draft",
    duration: "",
    introduction: "",
    main: "",
    notes: "",
    assets: [],
  };
}

export function CourseEditorPanel({
  slug,
  onClose,
  onSlugChange,
  onDirtyChange,
}: {
  slug: string;
  onClose: (options?: { force?: boolean; exit?: "left" | "right" }) => void;
  onSlugChange: (slug: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const router = useRouter();
  const [courseId, setCourseId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [summary, setSummary] = useState("");
  const [durationLabel, setDurationLabel] = useState("");
  const [coverPath, setCoverPath] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [status, setStatus] = useState<CourseStatus>("draft");
  const [lessons, setLessons] = useState<BuilderLesson[]>(() => [blankLesson()]);
  const [editing, setEditing] = useState<BuilderLesson | null>(() => lessons[0] ?? null);
  const [finalQuestions, setFinalQuestions] = useState<BuilderQuizQuestion[]>([]);
  const [quizOpen, setQuizOpen] = useState(false);
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const [stagedCover, setStagedCover] = useState<StagedFile | null>(null);
  const [stagedCoverVideo, setStagedCoverVideo] = useState<StagedFile | null>(null);
  const [stagedCoverPdf, setStagedCoverPdf] = useState<StagedFile | null>(null);
  const [stagedSectionFiles, setStagedSectionFiles] = useState<StagedSectionFiles>({});
  const [saved, setSaved] = useState(true);
  const [pending, setPending] = useState<"save" | "publish" | "delete" | "status" | null>(
    null
  );
  const [loading, setLoading] = useState(slug !== "new");
  const [error, setError] = useState<string | null>(null);
  const loadedSlug = useRef<string | null>(null);

  useEffect(() => {
    onDirtyChange(!saved);
  }, [onDirtyChange, saved]);

  useEffect(() => {
    if (saved) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saved]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (slug === "new") {
        if (loadedSlug.current === "new") {
          setLoading(false);
          return;
        }
        loadedSlug.current = "new";
        const lesson = blankLesson();
        setCourseId(null);
        setTitle("");
        setCourseSlug("");
        setSummary("");
        setDurationLabel("");
        setCoverPath("");
        setCoverUrl("");
        setStatus("draft");
        setLessons([lesson]);
        setEditing(lesson);
        setFinalQuestions([]);
        setQuizOpen(false);
        setStagedCover((current) => {
          revokeStaged(current);
          return null;
        });
        setStagedCoverVideo((current) => {
          revokeStaged(current);
          return null;
        });
        setStagedCoverPdf((current) => {
          revokeStaged(current);
          return null;
        });
        setStagedSectionFiles((current) => {
          revokeSectionFiles(current);
          return {};
        });
        setSaved(true);
        setError(null);
        setLoading(false);
        return;
      }

      if (loadedSlug.current === slug) return;
      setLoading(true);
      setError(null);
      const result = await loadAdminCourse(slug);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        setLoading(false);
        return;
      }
      applyCourse(result.course, result.coverUrl);
      loadedSlug.current = slug;
      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  function applyCourse(course: AdminCourseDetail, url: string) {
    const nextLessons = course.lessons.length ? course.lessons : [blankLesson()];
    setCourseId(course.id);
    setTitle(course.title);
    setCourseSlug(course.slug);
    setSummary(course.summary);
    setDurationLabel(course.durationLabel);
    setCoverPath(course.coverPath);
    setCoverUrl(url);
    setStatus(course.status);
    setLessons(nextLessons);
    setEditing(nextLessons[0] ?? null);
    setFinalQuestions(course.finalQuestions);
    setQuizOpen(course.finalQuestions.length > 0);
    setStagedCover((current) => {
      revokeStaged(current);
      return null;
    });
    setStagedCoverVideo((current) => {
      revokeStaged(current);
      return null;
    });
    setStagedCoverPdf((current) => {
      revokeStaged(current);
      return null;
    });
    setStagedSectionFiles((current) => {
      revokeSectionFiles(current);
      return {};
    });
    setSaved(true);
    setError(null);
  }

  function markDirty() {
    setSaved(false);
    setError(null);
  }

  function updateLesson(next: BuilderLesson) {
    setEditing(next);
    setLessons((current) => current.map((item) => (item.id === next.id ? next : item)));
    markDirty();
  }

  function createModule() {
    const next = blankLesson();
    setLessons((current) => [...current, next]);
    setEditing(next);
    markDirty();
  }

  function addQuestion() {
    if (slug === "dptc") return;
    setFinalQuestions((current) => [
      ...current,
      {
        id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        prompt: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      },
    ]);
    setQuizOpen(true);
    markDirty();
  }

  function duplicateQuestion(index: number) {
    const question = finalQuestions[index];
    if (!question) return;
    const copy = {
      ...question,
      id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      options: [...question.options] as BuilderQuizQuestion["options"],
    };
    setFinalQuestions((current) => [
      ...current.slice(0, index + 1),
      copy,
      ...current.slice(index + 1),
    ]);
    setQuizOpen(true);
    markDirty();
  }

  function removeQuestion(index: number) {
    setFinalQuestions((current) => current.filter((_, i) => i !== index));
    markDirty();
  }

  function payload(nextLessons = lessons, nextEditing = editing) {
    const currentLessons = nextEditing
      ? nextLessons.map((item) => (item.id === nextEditing.id ? nextEditing : item))
      : nextLessons;
    const lessonsToSave =
      currentLessons.length === 1
        ? currentLessons.map((lesson) => ({
            ...lesson,
            title: title.trim() || lesson.title,
          }))
        : currentLessons;
    return {
      slug,
      title,
      nextSlug: courseSlug || title,
      summary,
      durationLabel,
      coverPath,
      lessons: lessonsToSave,
      finalQuestions,
    };
  }

  function stageCover(file: File, previewUrl: string) {
    setStagedCover((current) => {
      if (current?.previewUrl !== previewUrl) revokeStaged(current);
      return { file, previewUrl };
    });
    setCoverUrl(previewUrl);
    markDirty();
  }

  function stageCoverMedia(kind: "video" | "pdf", file: File) {
    const staged = { file, previewUrl: "" };
    if (kind === "video") {
      setStagedCoverVideo((current) => {
        revokeStaged(current);
        return staged;
      });
    } else {
      setStagedCoverPdf((current) => {
        revokeStaged(current);
        return staged;
      });
    }
    markDirty();
  }

  function stageSectionFile(
    lessonId: string,
    section: LessonAssetSection,
    kind: SectionedAssetKind,
    file: File
  ) {
    const previewUrl = stagedPreview(file, kind);
    setStagedSectionFiles((current) => {
      const previous = current[lessonId]?.[section]?.[kind];
      if (previous?.previewUrl !== previewUrl) revokeStaged(previous);
      return {
        ...current,
        [lessonId]: {
          ...current[lessonId],
          [section]: {
            ...current[lessonId]?.[section],
            [kind]: { file, previewUrl },
          },
        },
      };
    });
    markDirty();
  }

  function applyLessonAssets(lessonId: string, assets: LessonAsset[]) {
    setLessons((current) =>
      current.map((item) => (item.id === lessonId ? { ...item, assets } : item))
    );
    setEditing((current) => (current?.id === lessonId ? { ...current, assets } : current));
  }

  function matchSavedLesson(draft: BuilderLesson, savedLessons: BuilderLesson[], index: number) {
    return (
      savedLessons.find((item) => item.id === draft.id) ??
      savedLessons.find((item) => item.slug === draft.slug || item.slug === slugFromTitle(draft.title)) ??
      savedLessons[index] ??
      null
    );
  }

  async function uploadSectionedFile(lessonId: string, section: string, file: File) {
    const body = new FormData();
    body.set("file", file);
    body.set("title", file.name.replace(/\.[^.]+$/, ""));
    body.set("section", section);
    return uploadLessonAsset(lessonId, body);
  }

  async function flushQueuedUploads(
    savedCourseId: string,
    draftLessons: BuilderLesson[],
    savedLessons: BuilderLesson[]
  ): Promise<{ lessons: BuilderLesson[]; error?: string }> {
    let nextLessons = savedLessons;
    const coverToFlush = stagedCover;
    const coverVideoToFlush = stagedCoverVideo;
    const coverPdfToFlush = stagedCoverPdf;
    const sectionsToFlush = stagedSectionFiles;

    if (coverToFlush) {
      setUploadToast(coverToFlush.file.name);
      const body = new FormData();
      body.set("file", coverToFlush.file);
      const coverResult = await uploadCourseCover(savedCourseId, body);
      if (!coverResult.ok) {
        setUploadToast(null);
        return { lessons: nextLessons, error: coverResult.error };
      }
      const preview = await previewCoverPath(coverResult.path);
      revokeStaged(coverToFlush);
      setStagedCover(null);
      setCoverPath(coverResult.path);
      setCoverUrl(preview.ok ? preview.url : "");
    }

    const firstDraft = draftLessons[0];
    const firstSaved = firstDraft ? matchSavedLesson(firstDraft, nextLessons, 0) : nextLessons[0];
    const coverFiles: { staged: StagedFile | null; clear: () => void }[] = [
      { staged: coverVideoToFlush, clear: () => setStagedCoverVideo(null) },
      { staged: coverPdfToFlush, clear: () => setStagedCoverPdf(null) },
    ];
    if (coverFiles.some((item) => item.staged)) {
      if (!firstSaved || !isUuid(firstSaved.id)) {
        setUploadToast(null);
        return { lessons: nextLessons, error: "Save the course first to upload cover media." };
      }
      for (const item of coverFiles) {
        if (!item.staged) continue;
        setUploadToast(item.staged.file.name);
        const uploaded = await uploadSectionedFile(firstSaved.id, "cover", item.staged.file);
        if (!uploaded.ok) {
          setUploadToast(null);
          return { lessons: nextLessons, error: uploaded.error };
        }
        revokeStaged(item.staged);
        item.clear();
        nextLessons = nextLessons.map((lesson) =>
          lesson.id === firstSaved.id ? { ...lesson, assets: uploaded.assets } : lesson
        );
      }
    }

    for (const [index, draft] of draftLessons.entries()) {
      const pending = sectionsToFlush[draft.id];
      if (!pending) continue;
      const savedLesson = matchSavedLesson(draft, nextLessons, index);
      if (!savedLesson || !isUuid(savedLesson.id)) {
        setUploadToast(null);
        return { lessons: nextLessons, error: "Save the course first to upload photos." };
      }
      for (const section of LESSON_ASSET_SECTIONS) {
        const files = pending[section];
        if (!files) continue;
        for (const kind of SECTION_MEDIA_KINDS) {
          const staged = files[kind];
          if (!staged) continue;
          setUploadToast(staged.file.name);
          const uploaded = await uploadSectionedFile(savedLesson.id, section, staged.file);
          if (!uploaded.ok) {
            setUploadToast(null);
            return { lessons: nextLessons, error: uploaded.error };
          }
          revokeStaged(staged);
          setStagedSectionFiles((current) => {
            const lesson = { ...current[draft.id] };
            const sectionFiles = { ...lesson[section] };
            delete sectionFiles[kind];
            if (Object.keys(sectionFiles).length) lesson[section] = sectionFiles;
            else delete lesson[section];
            const next = { ...current };
            if (Object.keys(lesson).length) next[draft.id] = lesson;
            else delete next[draft.id];
            return next;
          });
          nextLessons = nextLessons.map((item) =>
            item.id === savedLesson.id ? { ...item, assets: uploaded.assets } : item
          );
        }
      }
    }

    setUploadToast(null);
    return { lessons: nextLessons };
  }

  async function persist(mode: "save" | "publish") {
    if (pending) return;
    setPending(mode);
    setError(null);
    const input = payload();
    const result =
      mode === "publish" ? await publishSavedCourse(input) : await saveCourse(input);
    if (!result.ok) {
      setPending(null);
      setError(result.error);
      return;
    }
    setCourseId(result.courseId);
    const flushed = await flushQueuedUploads(result.courseId, input.lessons, result.lessons);
    setPending(null);
    if (flushed.error) {
      setError(flushed.error);
      if (flushed.lessons.length) {
        setLessons(flushed.lessons);
        const current = editing;
        const match = current
          ? flushed.lessons.find((item) => item.id === current.id || item.slug === current.slug)
          : flushed.lessons[0];
        setEditing(match ?? flushed.lessons[0] ?? null);
      }
      return;
    }
    setSaved(true);
    if (mode === "publish") {
      onClose({ force: true, exit: "left" });
      return;
    }
    if (flushed.lessons.length) {
      setLessons(flushed.lessons);
      const current = editing;
      const match = current
        ? flushed.lessons.find((item) => item.id === current.id || item.slug === current.slug)
        : flushed.lessons[0];
      setEditing(match ?? flushed.lessons[0] ?? null);
    }
    loadedSlug.current = result.slug;
    if (result.slug !== slug) onSlugChange(result.slug);
    router.refresh();
  }

  async function remove() {
    if (pending || slug === "new" || slug === "dptc") return;
    if (
      !window.confirm(
        "Delete this course? Lessons, enrolments, progress, and related records will be removed."
      )
    ) {
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
    onClose({ force: true });
  }

  async function toggleStatus() {
    const next: CourseStatus = status === "published" ? "draft" : "published";
    if (slug === "new") {
      setStatus(next);
      markDirty();
      return;
    }
    if (pending) return;
    setPending("status");
    const result = await setCourseStatus(slug, next);
    setPending(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStatus(next);
    router.refresh();
  }

  const live = status === "published";
  const lockedQuiz = slug === "dptc";
  const firstLesson = lessons[0] ?? null;

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <button
        type="button"
        onClick={() => onClose()}
        className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-950 lg:hidden"
      >
        ← Back to list
      </button>

      <div className="min-w-0 flex-1">
        {error ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        {loading ? (
          <p className="rounded-[28px] bg-white px-6 py-10 text-sm text-neutral-400">
            Loading course…
          </p>
        ) : (
          <div className="rounded-[28px] bg-white px-5 py-2 sm:px-6">
            <FieldRow label="Title">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-neutral-100 px-4">
                <input
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    markDirty();
                  }}
                  placeholder=""
                  className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
                />
                {!title.trim() ? (
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-semibold text-violet-800">
                    Lesson Topic
                  </span>
                ) : null}
              </div>
            </FieldRow>

            <FieldRow label="Status">
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void toggleStatus()}
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[10px] font-semibold",
                  live ? "bg-emerald-100 text-emerald-800" : "bg-violet-100 text-violet-800"
                )}
              >
                {pending === "status" ? "Saving..." : live ? "Live" : "Draft"}
                <ChevronDown className="size-3" />
              </button>
            </FieldRow>

            <FieldRow label="Slug">
              <div className="min-w-0 flex-1">
                <input
                  value={courseSlug}
                  onChange={(event) => {
                    setCourseSlug(event.target.value);
                    markDirty();
                  }}
                  className="h-11 w-full rounded-full bg-neutral-100 px-4 font-mono text-[13px] outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCourseSlug(slugFromTitle(title));
                    markDirty();
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500 hover:text-neutral-950"
                >
                  <Link2 className="size-3.5" />
                  Link To The Course Title
                </button>
              </div>
            </FieldRow>

            <FieldRow label="Duration">
              <input
                value={durationLabel}
                onChange={(event) => {
                  setDurationLabel(event.target.value);
                  markDirty();
                }}
                className="h-11 w-full rounded-full bg-neutral-100 px-4 text-sm outline-none"
              />
            </FieldRow>

            <FieldRow label="Cover">
              <div className="flex flex-wrap items-start gap-4">
                <SlotCaption label="Photo">
                  <CoverThumb
                    courseId={courseId}
                    src={coverUrl || (isPublicCoverPath(coverPath) ? coverPath : "")}
                    onUploading={setUploadToast}
                    onStaged={stageCover}
                    onUploaded={async (path) => {
                      setCoverPath(path);
                      const preview = await previewCoverPath(path);
                      setCoverUrl(preview.ok ? preview.url : "");
                      setSaved(true);
                      setUploadToast(null);
                    }}
                  />
                </SlotCaption>
                <SlotCaption label="Video">
                  <CoverFileThumb
                    kind="video"
                    lessonId={firstLesson?.id ?? null}
                    asset={sectionedLessonAsset(firstLesson?.assets ?? [], "cover", "video")}
                    stagedName={stagedCoverVideo?.file.name}
                    onUploading={setUploadToast}
                    onStaged={(file) => stageCoverMedia("video", file)}
                    onUploaded={(lessonId, assets) => {
                      applyLessonAssets(lessonId, assets);
                      setSaved(true);
                    }}
                  />
                </SlotCaption>
                <SlotCaption label="PDF">
                  <CoverFileThumb
                    kind="pdf"
                    lessonId={firstLesson?.id ?? null}
                    asset={sectionedLessonAsset(firstLesson?.assets ?? [], "cover", "pdf")}
                    stagedName={stagedCoverPdf?.file.name}
                    onUploading={setUploadToast}
                    onStaged={(file) => stageCoverMedia("pdf", file)}
                    onUploaded={(lessonId, assets) => {
                      applyLessonAssets(lessonId, assets);
                      setSaved(true);
                    }}
                  />
                </SlotCaption>
              </div>
            </FieldRow>

            {editing ? (
              <>
                {lessons.length > 1 ? (
                  <FieldRow label="Module">
                    <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                      {lessons.map((lesson) => (
                        <button
                          key={lesson.id}
                          type="button"
                          onClick={() => setEditing(lesson)}
                          className={cn(
                            "rounded-full px-3 py-1.5 text-[11px] font-semibold",
                            editing.id === lesson.id
                              ? "bg-neutral-950 text-white"
                              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                          )}
                        >
                          {lesson.title || "Untitled module"}
                        </button>
                      ))}
                    </div>
                  </FieldRow>
                ) : null}
                {slug !== "new" ? (
                  <div className="border-b border-neutral-100 py-4 pl-0 sm:pl-32">
                    <button
                      type="button"
                      onClick={createModule}
                      className="text-[11px] font-bold tracking-[0.12em] text-neutral-500 uppercase hover:text-neutral-950"
                    >
                      + Create new module
                    </button>
                  </div>
                ) : null}
                <EditorBlock
                  key={`${editing.id}-introduction`}
                  label="Introduction"
                  value={editing.introduction}
                  onChange={(introduction) => updateLesson({ ...editing, introduction })}
                  media={
                    <SectionMediaSlots
                      lessonId={editing.id}
                      section="introduction"
                      assets={editing.assets ?? []}
                      staged={stagedSectionFiles[editing.id]?.introduction}
                      onUploading={setUploadToast}
                      onStaged={(kind, file) =>
                        stageSectionFile(editing.id, "introduction", kind, file)
                      }
                      onUploaded={(assets) => updateLesson({ ...editing, assets })}
                    />
                  }
                />
                <EditorBlock
                  key={`${editing.id}-main`}
                  label="Main Content"
                  value={editing.main}
                  onChange={(main) => updateLesson({ ...editing, main })}
                  media={
                    <SectionMediaSlots
                      lessonId={editing.id}
                      section="main"
                      assets={editing.assets ?? []}
                      staged={stagedSectionFiles[editing.id]?.main}
                      onUploading={setUploadToast}
                      onStaged={(kind, file) => stageSectionFile(editing.id, "main", kind, file)}
                      onUploaded={(assets) => updateLesson({ ...editing, assets })}
                    />
                  }
                />
                <EditorBlock
                  key={`${editing.id}-notes`}
                  label="Additional Notes"
                  value={editing.notes}
                  onChange={(notes) => updateLesson({ ...editing, notes })}
                  media={
                    <SectionMediaSlots
                      lessonId={editing.id}
                      section="notes"
                      assets={editing.assets ?? []}
                      staged={stagedSectionFiles[editing.id]?.notes}
                      onUploading={setUploadToast}
                      onStaged={(kind, file) => stageSectionFile(editing.id, "notes", kind, file)}
                      onUploaded={(assets) => updateLesson({ ...editing, assets })}
                    />
                  }
                />
                <div className="border-t border-neutral-100 py-4 pl-0 sm:pl-32">
                  <LessonAssetsEditor
                    lessonId={editing.id}
                    assets={editing.assets ?? []}
                    hideIds={(editing.assets ?? [])
                      .filter((asset) => asset.section)
                      .map((asset) => asset.id)}
                    onChange={(assets) => updateLesson({ ...editing, assets })}
                  />
                </div>
              </>
            ) : null}
          </div>
        )}

        {quizOpen && !lockedQuiz && !loading ? (
          <FinalQuizEditor
            questions={finalQuestions}
            onChange={(next) => {
              setFinalQuestions(next);
              markDirty();
            }}
          />
        ) : null}
      </div>

      <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-64">
        <div className="flex items-center justify-between gap-3">
          <p className="inline-flex items-center gap-1.5 text-sm text-neutral-400">
            <Play className="size-3.5 fill-current" />
            {saved ? "Saved" : "Unsaved"}
          </p>
          <button
            type="button"
            onClick={() => void persist("publish")}
            disabled={pending !== null || loading}
            className="h-10 rounded-full bg-emerald-500 px-5 text-[11px] font-bold tracking-[0.12em] text-white uppercase hover:bg-emerald-600 disabled:opacity-60"
          >
            {pending === "publish" ? "Publishing…" : "Publish"}
          </button>
        </div>
        <button
          type="button"
          onClick={() => void persist("save")}
          disabled={pending !== null || loading}
          className="h-10 rounded-full bg-neutral-100 text-[11px] font-bold tracking-[0.12em] uppercase disabled:opacity-60"
        >
          {pending === "save" ? "Saving…" : "Save draft"}
        </button>
        {slug !== "new" && slug !== "dptc" ? (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={pending === "delete"}
            className="text-[11px] font-bold tracking-[0.12em] text-red-600 uppercase disabled:opacity-60"
          >
            {pending === "delete" ? "Deleting…" : "Delete course"}
          </button>
        ) : null}
        <div className="rounded-[28px] border border-neutral-200 bg-white px-5 py-6 text-center">
          <p className="text-[11px] font-bold tracking-[0.16em] text-neutral-500 uppercase">
            Assessment
          </p>
          {lockedQuiz ? (
            <p className="mt-2 text-sm text-neutral-400">
              DPTC Module 1 and the certificate assessment stay in the curriculum files. Do not
              re-author them here.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-neutral-400">
                Add an assessment to this lesson by clicking the button below
              </p>
              <ul className="mt-4 space-y-2">
                {finalQuestions.map((question, index) => (
                  <li
                    key={question.id}
                    className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3 py-2"
                  >
                    <span className="flex size-7 items-center justify-center rounded-lg bg-white text-sm font-semibold text-emerald-700">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left text-xs text-neutral-500">
                      {question.prompt.trim() || "Untitled question"}
                    </span>
                    <button
                      type="button"
                      onClick={() => duplicateQuestion(index)}
                      className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-white hover:text-neutral-700"
                      aria-label={`Duplicate question ${index + 1}`}
                    >
                      <Copy className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeQuestion(index)}
                      className="flex size-7 items-center justify-center rounded-md text-neutral-400 hover:bg-white hover:text-red-600"
                      aria-label={`Delete question ${index + 1}`}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addQuestion}
                className="mt-5 flex w-full items-center justify-between rounded-xl bg-neutral-950 px-4 py-2.5 text-[10px] font-bold tracking-[0.12em] text-white uppercase"
              >
                Add question
                <span className="flex size-6 items-center justify-center rounded-md bg-white text-neutral-950">
                  <Plus className="size-3.5" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => setQuizOpen((open) => !open)}
                className="mt-3 h-10 w-full rounded-xl border border-neutral-200 text-[10px] font-bold tracking-[0.12em] uppercase hover:bg-neutral-50"
              >
                {quizOpen ? "Hide quiz" : "Preview quiz"}
              </button>
            </>
          )}
        </div>
        {uploadToast ? (
          <p className="inline-flex items-center gap-2 self-end rounded-full bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-700">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            Uploading ‘{uploadToast}’
          </p>
        ) : null}
      </aside>
    </div>
  );
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-neutral-100 py-4 last:border-0 sm:flex-row sm:items-start">
      <p className="w-32 shrink-0 pt-3 text-sm text-neutral-500">{label}</p>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function CoverThumb({
  courseId,
  src,
  onUploaded,
  onStaged,
  onUploading,
}: {
  courseId: string | null;
  src: string;
  onUploaded: (path: string) => void | Promise<void>;
  onStaged: (file: File, previewUrl: string) => void;
  onUploading?: (name: string | null) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || pending) return;
    if (!courseId) {
      setError(null);
      onStaged(file, URL.createObjectURL(file));
      return;
    }
    setPending(true);
    setError(null);
    onUploading?.(file.name);
    const body = new FormData();
    body.set("file", file);
    const result = await uploadCourseCover(courseId, body);
    setPending(false);
    if (!result.ok) {
      onUploading?.(null);
      setError(result.error);
      return;
    }
    await onUploaded(result.path);
    onUploading?.(null);
  }

  return (
    <div>
      <label className="relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-neutral-200">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" />
        ) : null}
        <input
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          disabled={pending}
          onChange={(event) => void onChange(event)}
        />
      </label>
      {pending ? <p className="mt-1 text-[11px] text-neutral-400">Uploading…</p> : null}
      {error ? (
        <p className="mt-1 text-[11px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SlotCaption({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-1">
      {children}
      <p className="text-[10px] font-semibold tracking-[0.12em] text-neutral-400 uppercase">{label}</p>
    </div>
  );
}

function CoverFileThumb({
  kind,
  lessonId,
  asset,
  stagedName,
  onUploaded,
  onStaged,
  onUploading,
}: {
  kind: "video" | "pdf";
  lessonId: string | null;
  asset?: LessonAsset;
  stagedName?: string;
  onUploaded: (lessonId: string, assets: LessonAsset[]) => void;
  onStaged: (file: File) => void;
  onUploading?: (name: string | null) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saved = Boolean(lessonId && isUuid(lessonId));

  async function onFile(file: File) {
    if (pending) return;
    if (!saved || !lessonId) {
      setError(null);
      onStaged(file);
      return;
    }
    setPending(true);
    setError(null);
    onUploading?.(file.name);
    const body = new FormData();
    body.set("file", file);
    body.set("title", file.name.replace(/\.[^.]+$/, ""));
    body.set("section", "cover");
    const result = await uploadLessonAsset(lessonId, body);
    setPending(false);
    onUploading?.(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUploaded(lessonId, result.assets);
  }

  return (
    <div>
      <MediaKindSlot
        kind={kind}
        asset={asset}
        pending={pending}
        label={`Cover ${kind}`}
        stagedName={stagedName}
        onFile={(file) => void onFile(file)}
      />
      {error ? (
        <p className="mt-1 max-w-[9rem] text-[11px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const SECTION_MEDIA_SLOT_LABEL: Record<SectionedAssetKind, string> = {
  image: "Photo",
  video: "Video",
  pdf: "PDF",
};

function SectionMediaSlots({
  lessonId,
  section,
  assets,
  staged,
  onUploaded,
  onStaged,
  onUploading,
}: {
  lessonId: string;
  section: LessonAssetSection;
  assets: LessonAsset[];
  staged?: Partial<Record<SectionedAssetKind, StagedFile>>;
  onUploaded: (assets: LessonAsset[]) => void;
  onStaged: (kind: SectionedAssetKind, file: File) => void;
  onUploading?: (name: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {SECTION_MEDIA_KINDS.map((kind) => (
        <SlotCaption key={kind} label={SECTION_MEDIA_SLOT_LABEL[kind]}>
          <SectionFileThumb
            lessonId={lessonId}
            section={section}
            kind={kind}
            asset={sectionedLessonAsset(assets, section, kind)}
            staged={staged?.[kind]}
            onUploading={onUploading}
            onStaged={(file) => onStaged(kind, file)}
            onUploaded={onUploaded}
          />
        </SlotCaption>
      ))}
    </div>
  );
}

function SectionFileThumb({
  lessonId,
  section,
  kind,
  asset,
  staged,
  onUploaded,
  onStaged,
  onUploading,
}: {
  lessonId: string;
  section: LessonAssetSection;
  kind: SectionedAssetKind;
  asset?: LessonAsset;
  staged?: StagedFile;
  onUploaded: (assets: LessonAsset[]) => void;
  onStaged: (file: File) => void;
  onUploading?: (name: string | null) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const saved = isUuid(lessonId);

  async function onFile(file: File) {
    if (pending) return;
    if (!saved) {
      setError(null);
      onStaged(file);
      return;
    }
    setPending(true);
    setError(null);
    onUploading?.(file.name);
    const body = new FormData();
    body.set("file", file);
    body.set("title", file.name.replace(/\.[^.]+$/, ""));
    body.set("section", section);
    const result = await uploadLessonAsset(lessonId, body);
    setPending(false);
    onUploading?.(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUploaded(result.assets);
  }

  return (
    <div>
      <MediaKindSlot
        kind={kind}
        asset={asset}
        previewUrl={kind === "image" ? staged?.previewUrl : undefined}
        stagedName={kind === "image" ? undefined : staged?.file.name}
        pending={pending}
        label={`${section} ${kind}`}
        onFile={(file) => void onFile(file)}
      />
      {error ? (
        <p className="mt-1 max-w-[9rem] text-[11px] text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function MediaKindSlot({
  kind,
  asset,
  previewUrl,
  stagedName,
  pending,
  label,
  onFile,
}: {
  kind: SectionedAssetKind;
  asset?: LessonAsset;
  previewUrl?: string;
  stagedName?: string;
  pending: boolean;
  label: string;
  onFile: (file: File) => void;
}) {
  const [url, setUrl] = useState<string | null>(kind === "image" ? previewUrl ?? null : null);
  const accept = kind === "image" ? IMAGE_ACCEPT : kind === "video" ? VIDEO_ACCEPT : PDF_ACCEPT;
  const Icon = kind === "video" ? Film : FileText;
  const filename = asset?.title || stagedName;
  const filled = Boolean(asset || stagedName || (kind === "image" && (previewUrl || url)));

  useEffect(() => {
    if (kind !== "image") return;
    if (previewUrl) {
      setUrl(previewUrl);
      return;
    }
    if (!asset) {
      setUrl(null);
      return;
    }
    if (asset.externalUrl) {
      setUrl(asset.externalUrl);
      return;
    }
    if (!isUuid(asset.id)) return;
    let cancelled = false;
    void getLessonAssetSignedUrl(asset.id).then((result) => {
      if (!cancelled && result.ok) setUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [asset, previewUrl, kind]);

  return (
    <label
      className="relative flex size-10 cursor-pointer items-center justify-center overflow-hidden rounded-lg bg-neutral-200"
      aria-label={label}
      title={filename || label}
    >
      {kind === "image" && url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : kind !== "image" ? (
        <Icon className={cn("size-4", filled ? "text-neutral-800" : "text-neutral-400")} />
      ) : null}
      {pending ? (
        <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-[8px] font-bold tracking-wider text-neutral-500 uppercase">
          …
        </span>
      ) : null}
      <input
        type="file"
        accept={accept}
        className="sr-only"
        disabled={pending}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </label>
  );
}

function newParagraphId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function EditorBlock({
  label,
  value,
  onChange,
  media,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  media?: React.ReactNode;
}) {
  const [boxes, setBoxes] = useState(() =>
    splitLessonParagraphs(value).map((html) => ({ id: newParagraphId(), html }))
  );
  const boxesRef = useRef(boxes);
  boxesRef.current = boxes;
  const [focusId, setFocusId] = useState<string | null>(boxes[0]?.id ?? null);

  function emit(next: { id: string; html: string }[]) {
    boxesRef.current = next;
    setBoxes(next);
    onChange(joinLessonParagraphs(next.map((box) => box.html)));
  }

  return (
    <FieldRow label={label}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        {media}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {boxes.map((box, index) => (
            <ParagraphBox
              key={box.id}
              label={label}
              initialHtml={box.html}
              autoFocus={focusId === box.id && index > 0 && !box.html}
              canRemove={index > 0}
              onHtmlChange={(html) => {
                emit(
                  boxesRef.current.map((item) => (item.id === box.id ? { ...item, html } : item))
                );
              }}
              onAdd={() => {
                const id = newParagraphId();
                setFocusId(id);
                emit([...boxesRef.current, { id, html: "" }]);
              }}
              onRemove={() => {
                if (index === 0) return;
                const next = boxesRef.current.filter((item) => item.id !== box.id);
                setFocusId(next[Math.min(index, next.length - 1)]?.id ?? null);
                emit(next);
              }}
            />
          ))}
        </div>
      </div>
    </FieldRow>
  );
}

function ParagraphBox({
  label,
  initialHtml,
  autoFocus,
  canRemove,
  onHtmlChange,
  onAdd,
  onRemove,
}: {
  label: string;
  initialHtml: string;
  autoFocus?: boolean;
  canRemove: boolean;
  onHtmlChange: (html: string) => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const initialHtmlRef = useRef(initialHtml);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = toEditableHtml(initialHtmlRef.current);
  }, []);

  useEffect(() => {
    if (autoFocus) editorRef.current?.focus();
  }, [autoFocus]);

  function currentHtml() {
    return editorRef.current?.innerHTML ?? "";
  }

  function runCommand(command: string, value?: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      // execCommand styleWithCSS is best-effort
    }
    document.execCommand(command, false, value);
    onHtmlChange(currentHtml());
  }

  function runAlign(command: "justifyLeft" | "justifyCenter" | "justifyRight") {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {
      // execCommand styleWithCSS is best-effort
    }
    document.execCommand(command, false);
    try {
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      // restore default for bold/italic
    }
    onHtmlChange(currentHtml());
  }

  function applyLink() {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const raw = window.prompt("Enter URL", "https://");
    if (raw == null) return;
    const href = normalizeLinkUrl(raw);
    if (!href) return;
    const selection = window.getSelection();
    const hasSelection =
      selection &&
      selection.rangeCount > 0 &&
      !selection.isCollapsed &&
      el.contains(selection.anchorNode);
    if (hasSelection) {
      runCommand("createLink", href);
      return;
    }
    const safe = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
    document.execCommand("insertHTML", false, `<a href="${safe}">${safe}</a>`);
    onHtmlChange(currentHtml());
  }

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-neutral-100">
      <div className="flex items-center gap-2 px-3 py-2 text-neutral-400">
        <ToolbarIconButton label="Add paragraph" onClick={onAdd}>
          <Plus className="size-3.5" />
        </ToolbarIconButton>
        <span className="text-[11px] font-semibold text-neutral-400">Paragraph</span>
        {canRemove ? (
          <ToolbarIconButton label="Remove paragraph" onClick={onRemove}>
            <Trash2 className="size-3.5" />
          </ToolbarIconButton>
        ) : null}
        <span className="ml-auto flex items-center gap-2">
          <ToolbarIconButton label="Link" onClick={applyLink}>
            <Link2 className="size-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton label="Bold" onClick={() => runCommand("bold")}>
            <Bold className="size-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton label="Italic" onClick={() => runCommand("italic")}>
            <Italic className="size-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton label="List" onClick={() => runCommand("insertUnorderedList")}>
            <List className="size-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton label="Align left" onClick={() => runAlign("justifyLeft")}>
            <AlignLeft className="size-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton label="Align center" onClick={() => runAlign("justifyCenter")}>
            <AlignCenter className="size-3.5" />
          </ToolbarIconButton>
          <ToolbarIconButton label="Align right" onClick={() => runAlign("justifyRight")}>
            <AlignRight className="size-3.5" />
          </ToolbarIconButton>
        </span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        data-placeholder="Input text here"
        className={cn(
          "min-h-24 w-full bg-transparent px-3 pb-3 text-sm leading-relaxed text-neutral-700 outline-none",
          "[&:empty]:before:pointer-events-none [&:empty]:before:text-neutral-400 [&:empty]:before:content-[attr(data-placeholder)]",
          "[&_a]:underline [&_b]:font-semibold [&_em]:italic [&_i]:italic [&_strong]:font-semibold",
          "[&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5",
          "[&_[align=left]]:text-left [&_[align=center]]:text-center [&_[align=right]]:text-right",
          "[&_[style*='text-align:left']]:text-left [&_[style*='text-align: left']]:text-left",
          "[&_[style*='text-align:center']]:text-center [&_[style*='text-align: center']]:text-center",
          "[&_[style*='text-align:right']]:text-right [&_[style*='text-align: right']]:text-right"
        )}
        onInput={() => onHtmlChange(currentHtml())}
        onPaste={(event) => {
          event.preventDefault();
          const html = event.clipboardData.getData("text/html");
          const text = event.clipboardData.getData("text/plain");
          const snippet = html ? toEditableHtml(html) : toEditableHtml(text);
          document.execCommand("insertHTML", false, snippet);
          onHtmlChange(currentHtml());
        }}
      />
    </div>
  );
}

function ToolbarIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className="rounded-md p-0.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
    >
      {children}
    </button>
  );
}
