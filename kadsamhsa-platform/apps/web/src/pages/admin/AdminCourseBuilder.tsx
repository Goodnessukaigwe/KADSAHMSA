import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import type {
  AdminContentBlock,
  AdminCourseDetail,
  AdminLesson,
  AdminQuiz,
} from '@kadsamhsa/domain';
import { api } from '../../data/api';
import { routes } from '../../data/site';
import { AdminPage, StatusPill, adminPaths, errorMessage, formatMoney } from './AdminLayout';

type BlockType = AdminContentBlock['type'];

/** Which extra fields a block type needs, so one form can serve all eight. */
type BlockShape = 'html' | 'media' | 'file' | 'quiz';

const BLOCK_TYPES: { value: BlockType; label: string; shape: BlockShape }[] = [
  { value: 'rich_text', label: 'Rich text', shape: 'html' },
  { value: 'video', label: 'Video', shape: 'media' },
  { value: 'slides', label: 'Slides', shape: 'file' },
  { value: 'pdf', label: 'PDF', shape: 'file' },
  { value: 'download', label: 'Download', shape: 'file' },
  { value: 'image', label: 'Image', shape: 'file' },
  { value: 'audio', label: 'Audio', shape: 'file' },
  { value: 'quiz', label: 'Quiz', shape: 'quiz' },
];

const BLOCK_LABELS = new Map(BLOCK_TYPES.map((entry) => [entry.value, entry.label]));

function shapeFor(type: BlockType): BlockShape {
  return BLOCK_TYPES.find((entry) => entry.value === type)?.shape ?? 'file';
}

interface BlockDraft {
  type: BlockType;
  html: string;
  url: string;
  provider: string;
  filename: string;
  quizId: string;
}

const EMPTY_BLOCK_DRAFT: BlockDraft = {
  type: 'rich_text',
  html: '',
  url: '',
  provider: '',
  filename: '',
  quizId: '',
};

/**
 * Builds the payload the API expects for the drafted type, or null when a
 * required field is still blank. Optional fields are omitted rather than sent
 * empty — the schema rejects an empty `provider`/`filename` string.
 */
function blockPayload(draft: BlockDraft): Record<string, unknown> | null {
  switch (shapeFor(draft.type)) {
    case 'html': {
      return draft.html.trim() ? { html: draft.html } : null;
    }
    case 'quiz': {
      const quizId = draft.quizId.trim();
      return quizId ? { quizId } : null;
    }
    case 'media': {
      const url = draft.url.trim();
      if (!url) {
        return null;
      }
      const provider = draft.provider.trim();
      return provider ? { url, provider } : { url };
    }
    default: {
      const url = draft.url.trim();
      if (!url) {
        return null;
      }
      const filename = draft.filename.trim();
      return filename ? { url, filename } : { url };
    }
  }
}

/** One line of context under a block row, so the tree is readable at a glance. */
function blockSummary(block: AdminContentBlock, quizTitles: Map<string, string>): string {
  const payload = block.payload;
  if (block.type === 'rich_text') {
    const html = typeof payload.html === 'string' ? payload.html : '';
    const text = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) {
      return 'Empty text block';
    }
    return text.length > 90 ? `${text.slice(0, 90)}…` : text;
  }
  if (block.type === 'quiz') {
    const quizId = typeof payload.quizId === 'string' ? payload.quizId : '';
    return quizTitles.get(quizId) ?? (quizId ? `Quiz ${quizId}` : 'No quiz selected');
  }
  return typeof payload.url === 'string' && payload.url ? payload.url : 'No URL set';
}

interface SettingsForm {
  title: string;
  summary: string;
  description: string;
  objectives: string;
  coverImageUrl: string;
  priceType: 'free' | 'paid';
  priceNaira: string;
  durationMinutes: string;
  passMarkPercent: string;
  certificateEnabled: boolean;
  isFeatured: boolean;
}

function toForm(course: AdminCourseDetail): SettingsForm {
  return {
    title: course.title,
    summary: course.summary,
    description: course.description,
    // One objective per line is how staff already write them in a document.
    objectives: course.objectives.join('\n'),
    coverImageUrl: course.coverImageUrl ?? '',
    priceType: course.priceType,
    // Kobo in, Naira on screen; converted back on save.
    priceNaira: course.priceAmount === null ? '' : String(course.priceAmount / 100),
    durationMinutes: course.durationMinutes === null ? '' : String(course.durationMinutes),
    passMarkPercent: String(course.passMarkPercent),
    certificateEnabled: course.certificateEnabled,
    isFeatured: course.isFeatured,
  };
}

function parseIntOr(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * The course builder (PRD A1–A4): the module/lesson/block tree on the left,
 * course settings on the right, publishing in the header.
 *
 * Every tree mutation returns the whole course, so the server's ordering and
 * counts are what render — the client never guesses what the tree became.
 * Settings state is held separately and only re-synced after an explicit save,
 * so adding a lesson cannot silently discard half-typed copy.
 */
export function AdminCourseBuilder() {
  const { courseId = '' } = useParams();

  const [course, setCourse] = useState<AdminCourseDetail | null>(null);
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [quizzes, setQuizzes] = useState<AdminQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const [moduleTitle, setModuleTitle] = useState('');
  const [lessonModuleId, setLessonModuleId] = useState<string | null>(null);
  const [lessonTitle, setLessonTitle] = useState('');
  const [blockLessonId, setBlockLessonId] = useState<string | null>(null);
  const [blockDraft, setBlockDraft] = useState<BlockDraft>(EMPTY_BLOCK_DRAFT);

  useEffect(() => {
    if (!courseId) {
      setLoadError('That course link is incomplete.');
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    api
      .adminCourse(courseId)
      .then((result) => {
        if (!active) {
          return;
        }
        setCourse(result);
        setForm(toForm(result));
        setLoadError(null);
      })
      .catch((caught: unknown) => {
        if (active) {
          setCourse(null);
          setForm(null);
          setLoadError(errorMessage(caught, 'Could not load this course.'));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  // Quizzes are a separate permission (quiz:manage), so a content admin without
  // it still gets the whole builder — the quiz block just falls back to an id
  // field instead of a picker.
  useEffect(() => {
    if (!courseId) {
      return;
    }
    let active = true;
    api
      .adminQuizzes(courseId)
      .then((result) => {
        if (active) {
          setQuizzes(result);
        }
      })
      .catch(() => {
        if (active) {
          setQuizzes([]);
        }
      });
    return () => {
      active = false;
    };
  }, [courseId]);

  const quizTitles = new Map(quizzes.map((quiz) => [quiz.id, quiz.title]));

  /** Wraps a mutation: one busy flag, one error line, one fresh course. */
  const run = useCallback(
    async (fallback: string, action: () => Promise<AdminCourseDetail>) => {
      setBusy(true);
      setActionError(null);
      setNotice(null);
      try {
        setCourse(await action());
        return true;
      } catch (caught) {
        setActionError(errorMessage(caught, fallback));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const addModule = async (event: FormEvent) => {
    event.preventDefault();
    const title = moduleTitle.trim();
    if (title.length < 2) {
      setActionError('Give the module a title of at least two characters.');
      return;
    }
    const ok = await run('Could not add the module.', () =>
      api.adminCreateModule(courseId, title),
    );
    if (ok) {
      setModuleTitle('');
    }
  };

  const addLesson = async (event: FormEvent, moduleId: string) => {
    event.preventDefault();
    const title = lessonTitle.trim();
    if (title.length < 2) {
      setActionError('Give the lesson a title of at least two characters.');
      return;
    }
    const ok = await run('Could not add the lesson.', () =>
      api.adminCreateLesson(moduleId, title),
    );
    if (ok) {
      setLessonTitle('');
      setLessonModuleId(null);
    }
  };

  const addBlock = async (event: FormEvent, lessonId: string) => {
    event.preventDefault();
    const payload = blockPayload(blockDraft);
    if (!payload) {
      setActionError(
        blockDraft.type === 'rich_text'
          ? 'Write some content before adding the block.'
          : blockDraft.type === 'quiz'
            ? 'Choose a quiz before adding the block.'
            : 'Enter a URL before adding the block.',
      );
      return;
    }
    const ok = await run('Could not add the content block.', () =>
      api.adminCreateBlock(lessonId, { type: blockDraft.type, payload }),
    );
    if (ok) {
      setBlockDraft(EMPTY_BLOCK_DRAFT);
      setBlockLessonId(null);
    }
  };

  const deleteBlock = (blockId: string) =>
    run('Could not delete the content block.', async () => {
      // The delete answers 204, so the tree is re-read rather than patched
      // locally — positions are resequenced server-side.
      await api.adminDeleteBlock(blockId);
      return api.adminCourse(courseId);
    });

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    if (!form || !course) {
      return;
    }
    setSaving(true);
    setActionError(null);
    setNotice(null);

    const naira = Number.parseFloat(form.priceNaira);
    const duration = form.durationMinutes.trim();

    try {
      const updated = await api.adminUpdateCourse(course.id, {
        title: form.title.trim(),
        summary: form.summary.trim(),
        description: form.description,
        objectives: form.objectives
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
        coverImageUrl: form.coverImageUrl.trim() || null,
        priceType: form.priceType,
        // Naira to kobo. Rounded, never floored: the ledger is integer minor
        // units and a half-kobo cannot exist.
        priceAmount:
          form.priceType === 'paid' ? Math.round((Number.isFinite(naira) ? naira : 0) * 100) : null,
        durationMinutes: duration === '' ? null : parseIntOr(duration, 0),
        passMarkPercent: parseIntOr(form.passMarkPercent, course.passMarkPercent),
        certificateEnabled: form.certificateEnabled,
        isFeatured: form.isFeatured,
      });
      setCourse(updated);
      // Re-sync: the API may have re-slugged a draft, or normalised a price.
      setForm(toForm(updated));
      setNotice('Course settings saved.');
    } catch (caught) {
      setActionError(errorMessage(caught, 'Could not save the course settings.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    if (!course) {
      return;
    }
    const next = course.status === 'published' ? 'draft' : 'published';
    const ok = await run(
      next === 'published' ? 'Could not publish this course.' : 'Could not unpublish this course.',
      () => api.adminSetCourseStatus(course.id, next),
    );
    if (ok) {
      setNotice(next === 'published' ? 'Course published.' : 'Course moved back to draft.');
    }
  };

  if (loading) {
    return (
      <AdminPage title="Course builder">
        <p className="kadsamhsa-admin__state">Loading this course…</p>
      </AdminPage>
    );
  }

  if (loadError || !course || !form) {
    return (
      <AdminPage title="Course builder">
        <p className="kadsamhsa-admin__error" role="alert">
          {loadError ?? 'This course could not be opened.'}
        </p>
        <Link to={adminPaths.courses} className="kadsamhsa-admin__btn kadsamhsa-admin__btn--ghost">
          Back to courses
        </Link>
      </AdminPage>
    );
  }

  const lessonCount = course.modules.reduce((total, module) => total + module.lessons.length, 0);
  const draftShape = shapeFor(blockDraft.type);

  return (
    <AdminPage
      title={course.title}
      subtitle={`${course.moduleCount} ${course.moduleCount === 1 ? 'module' : 'modules'} · ${
        course.lessonCount
      } ${course.lessonCount === 1 ? 'lesson' : 'lessons'} · ${
        course.enrolmentCount
      } enrolled · ${
        course.priceType === 'free'
          ? 'Free'
          : course.priceAmount === null
            ? 'No price set'
            : formatMoney(course.priceAmount, course.currency)
      }`}
      actions={
        <>
          <StatusPill status={course.status} />
          <button
            type="submit"
            form="kadsamhsa-admin-settings"
            className="kadsamhsa-admin__btn kadsamhsa-admin__btn--primary"
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Link
            to={routes.course(course.slug)}
            className="kadsamhsa-admin__btn kadsamhsa-admin__btn--ghost"
            target="_blank"
            rel="noreferrer"
          >
            Preview
          </Link>
          <button
            type="button"
            className="kadsamhsa-admin__btn kadsamhsa-admin__btn--ghost"
            onClick={toggleStatus}
            disabled={busy}
          >
            {course.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
        </>
      }
    >
      <nav className="kadsamhsa-admin__tabs" aria-label="Course sections">
        <span className="kadsamhsa-admin__tab is-active" aria-current="page">
          Content
        </span>
        <Link to={adminPaths.courseLearners(course.id)} className="kadsamhsa-admin__tab">
          Learners ({course.enrolmentCount})
        </Link>
        <Link to={adminPaths.courses} className="kadsamhsa-admin__tab">
          All courses
        </Link>
      </nav>

      {actionError && (
        <p className="kadsamhsa-admin__error" role="alert">
          {actionError}
        </p>
      )}
      {notice && (
        <p className="kadsamhsa-admin__notice" role="status">
          {notice}
        </p>
      )}
      {course.status !== 'published' && lessonCount === 0 && (
        <p className="kadsamhsa-admin__notice">
          Add at least one lesson before publishing this course.
        </p>
      )}

      <div className="kadsamhsa-admin__builder">
        {/* ---- Tree ---- */}
        <section className="kadsamhsa-admin__panel" aria-labelledby="kadsamhsa-admin-tree-title">
          <div className="kadsamhsa-admin__panel-head">
            <h2 className="kadsamhsa-admin__panel-title" id="kadsamhsa-admin-tree-title">
              Course content
            </h2>
          </div>

          {course.modules.length === 0 && (
            <p className="kadsamhsa-admin__state">
              No modules yet. Add the first one to start building.
            </p>
          )}

          <ol className="kadsamhsa-admin__tree">
            {course.modules.map((module, moduleIndex) => (
              <li key={module.id} className="kadsamhsa-admin__module">
                <div className="kadsamhsa-admin__module-head">
                  <h3 className="kadsamhsa-admin__module-title">
                    <span className="kadsamhsa-admin__module-no">{moduleIndex + 1}</span>
                    {module.title}
                  </h3>
                  <button
                    type="button"
                    className="kadsamhsa-admin__btn kadsamhsa-admin__btn--subtle"
                    onClick={() => {
                      setLessonModuleId((open) => (open === module.id ? null : module.id));
                      setLessonTitle('');
                    }}
                    aria-expanded={lessonModuleId === module.id}
                  >
                    {lessonModuleId === module.id ? 'Cancel' : 'Add lesson'}
                  </button>
                </div>

                {lessonModuleId === module.id && (
                  <form
                    className="kadsamhsa-admin__inline-form"
                    onSubmit={(event) => addLesson(event, module.id)}
                  >
                    <div className="kadsamhsa-admin__field">
                      <label
                        className="kadsamhsa-admin__label"
                        htmlFor={`kadsamhsa-admin-lesson-${module.id}`}
                      >
                        Lesson title
                      </label>
                      <input
                        id={`kadsamhsa-admin-lesson-${module.id}`}
                        className="kadsamhsa-admin__input"
                        value={lessonTitle}
                        onChange={(event) => setLessonTitle(event.target.value)}
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      className="kadsamhsa-admin__btn kadsamhsa-admin__btn--primary"
                      disabled={busy}
                    >
                      Add lesson
                    </button>
                  </form>
                )}

                {module.lessons.length === 0 ? (
                  <p className="kadsamhsa-admin__state kadsamhsa-admin__state--tight">
                    No lessons in this module yet.
                  </p>
                ) : (
                  <ol className="kadsamhsa-admin__lessons">
                    {module.lessons.map((lesson) => (
                      <LessonNode
                        key={lesson.id}
                        lesson={lesson}
                        quizTitles={quizTitles}
                        busy={busy}
                        open={blockLessonId === lesson.id}
                        draft={blockDraft}
                        draftShape={draftShape}
                        quizzes={quizzes}
                        onToggle={() => {
                          setBlockLessonId((open) => (open === lesson.id ? null : lesson.id));
                          setBlockDraft(EMPTY_BLOCK_DRAFT);
                        }}
                        onDraftChange={(patch) =>
                          setBlockDraft((current) => ({ ...current, ...patch }))
                        }
                        onSubmit={(event) => addBlock(event, lesson.id)}
                        onDeleteBlock={deleteBlock}
                      />
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ol>

          <form className="kadsamhsa-admin__inline-form" onSubmit={addModule}>
            <div className="kadsamhsa-admin__field">
              <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-module">
                New module title
              </label>
              <input
                id="kadsamhsa-admin-module"
                className="kadsamhsa-admin__input"
                value={moduleTitle}
                onChange={(event) => setModuleTitle(event.target.value)}
                placeholder="Understanding substance use"
              />
            </div>
            <button
              type="submit"
              className="kadsamhsa-admin__btn kadsamhsa-admin__btn--primary"
              disabled={busy}
            >
              Add module
            </button>
          </form>
        </section>

        {/* ---- Settings ---- */}
        <section className="kadsamhsa-admin__panel" aria-labelledby="kadsamhsa-admin-settings-title">
          <div className="kadsamhsa-admin__panel-head">
            <h2 className="kadsamhsa-admin__panel-title" id="kadsamhsa-admin-settings-title">
              Course settings
            </h2>
          </div>

          <form id="kadsamhsa-admin-settings" className="kadsamhsa-admin__form" onSubmit={saveSettings}>
            <div className="kadsamhsa-admin__field">
              <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-title">
                Title
              </label>
              <input
                id="kadsamhsa-admin-title"
                className="kadsamhsa-admin__input"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>

            <div className="kadsamhsa-admin__field">
              <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-summary">
                Summary
              </label>
              <textarea
                id="kadsamhsa-admin-summary"
                className="kadsamhsa-admin__textarea"
                rows={2}
                value={form.summary}
                onChange={(event) => setForm({ ...form, summary: event.target.value })}
              />
              <p className="kadsamhsa-admin__hint">One or two lines for the catalogue card.</p>
            </div>

            <div className="kadsamhsa-admin__field">
              <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-description">
                Description
              </label>
              <textarea
                id="kadsamhsa-admin-description"
                className="kadsamhsa-admin__textarea"
                rows={5}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <div className="kadsamhsa-admin__field">
              <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-objectives">
                Learning objectives
              </label>
              <textarea
                id="kadsamhsa-admin-objectives"
                className="kadsamhsa-admin__textarea"
                rows={4}
                value={form.objectives}
                onChange={(event) => setForm({ ...form, objectives: event.target.value })}
              />
              <p className="kadsamhsa-admin__hint">One objective per line.</p>
            </div>

            <div className="kadsamhsa-admin__field">
              <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-cover">
                Cover image URL
              </label>
              <input
                id="kadsamhsa-admin-cover"
                className="kadsamhsa-admin__input"
                value={form.coverImageUrl}
                onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })}
                placeholder="https://…"
              />
            </div>

            <div className="kadsamhsa-admin__grid2">
              <div className="kadsamhsa-admin__field">
                <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-pricetype">
                  Price type
                </label>
                <select
                  id="kadsamhsa-admin-pricetype"
                  className="kadsamhsa-admin__select"
                  value={form.priceType}
                  onChange={(event) =>
                    setForm({ ...form, priceType: event.target.value as 'free' | 'paid' })
                  }
                >
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div className="kadsamhsa-admin__field">
                <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-price">
                  Price (₦)
                </label>
                <input
                  id="kadsamhsa-admin-price"
                  className="kadsamhsa-admin__input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.priceNaira}
                  onChange={(event) => setForm({ ...form, priceNaira: event.target.value })}
                  disabled={form.priceType === 'free'}
                />
                <p className="kadsamhsa-admin__hint">Stored in kobo.</p>
              </div>

              <div className="kadsamhsa-admin__field">
                <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-duration">
                  Duration (minutes)
                </label>
                <input
                  id="kadsamhsa-admin-duration"
                  className="kadsamhsa-admin__input"
                  type="number"
                  min={0}
                  value={form.durationMinutes}
                  onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })}
                />
              </div>

              <div className="kadsamhsa-admin__field">
                <label className="kadsamhsa-admin__label" htmlFor="kadsamhsa-admin-passmark">
                  Pass mark (%)
                </label>
                <input
                  id="kadsamhsa-admin-passmark"
                  className="kadsamhsa-admin__input"
                  type="number"
                  min={1}
                  max={100}
                  value={form.passMarkPercent}
                  onChange={(event) => setForm({ ...form, passMarkPercent: event.target.value })}
                />
              </div>
            </div>

            <label className="kadsamhsa-admin__check">
              <input
                type="checkbox"
                checked={form.certificateEnabled}
                onChange={(event) =>
                  setForm({ ...form, certificateEnabled: event.target.checked })
                }
              />
              <span>Issue a certificate on completion</span>
            </label>

            <label className="kadsamhsa-admin__check">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })}
              />
              <span>Feature this course on the learner dashboard</span>
            </label>

            <button
              type="submit"
              className="kadsamhsa-admin__btn kadsamhsa-admin__btn--primary"
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save settings'}
            </button>
          </form>
        </section>
      </div>
    </AdminPage>
  );
}

interface LessonNodeProps {
  lesson: AdminLesson;
  quizTitles: Map<string, string>;
  quizzes: AdminQuiz[];
  busy: boolean;
  open: boolean;
  draft: BlockDraft;
  draftShape: BlockShape;
  onToggle: () => void;
  onDraftChange: (patch: Partial<BlockDraft>) => void;
  onSubmit: (event: FormEvent) => void;
  onDeleteBlock: (blockId: string) => void;
}

function LessonNode({
  lesson,
  quizTitles,
  quizzes,
  busy,
  open,
  draft,
  draftShape,
  onToggle,
  onDraftChange,
  onSubmit,
  onDeleteBlock,
}: LessonNodeProps) {
  return (
    <li className="kadsamhsa-admin__lesson">
      <div className="kadsamhsa-admin__lesson-head">
        <h4 className="kadsamhsa-admin__lesson-title">{lesson.title}</h4>
        <div className="kadsamhsa-admin__lesson-meta">
          {lesson.durationMinutes !== null && <span>{lesson.durationMinutes} min</span>}
          {!lesson.isRequired && <span>Optional</span>}
          <button
            type="button"
            className="kadsamhsa-admin__btn kadsamhsa-admin__btn--subtle"
            onClick={onToggle}
            aria-expanded={open}
          >
            {open ? 'Cancel' : 'Add block'}
          </button>
        </div>
      </div>

      {lesson.blocks.length > 0 && (
        <ul className="kadsamhsa-admin__blocks">
          {lesson.blocks.map((block) => (
            <li key={block.id} className="kadsamhsa-admin__block">
              <span className="kadsamhsa-admin__block-type">
                {BLOCK_LABELS.get(block.type) ?? block.type}
              </span>
              <span className="kadsamhsa-admin__block-body">
                {blockSummary(block, quizTitles)}
              </span>
              <button
                type="button"
                className="kadsamhsa-admin__btn kadsamhsa-admin__btn--danger"
                onClick={() => onDeleteBlock(block.id)}
                disabled={busy}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form className="kadsamhsa-admin__inline-form" onSubmit={onSubmit}>
          <div className="kadsamhsa-admin__field">
            <label
              className="kadsamhsa-admin__label"
              htmlFor={`kadsamhsa-admin-blocktype-${lesson.id}`}
            >
              Block type
            </label>
            <select
              id={`kadsamhsa-admin-blocktype-${lesson.id}`}
              className="kadsamhsa-admin__select"
              value={draft.type}
              onChange={(event) => onDraftChange({ type: event.target.value as BlockType })}
            >
              {BLOCK_TYPES.map((entry) => (
                <option key={entry.value} value={entry.value}>
                  {entry.label}
                </option>
              ))}
            </select>
          </div>

          {draftShape === 'html' && (
            <div className="kadsamhsa-admin__field">
              <label
                className="kadsamhsa-admin__label"
                htmlFor={`kadsamhsa-admin-blockhtml-${lesson.id}`}
              >
                Content (HTML)
              </label>
              <textarea
                id={`kadsamhsa-admin-blockhtml-${lesson.id}`}
                className="kadsamhsa-admin__textarea"
                rows={5}
                value={draft.html}
                onChange={(event) => onDraftChange({ html: event.target.value })}
                placeholder="<p>Why this matters…</p>"
              />
            </div>
          )}

          {(draftShape === 'media' || draftShape === 'file') && (
            <div className="kadsamhsa-admin__field">
              <label
                className="kadsamhsa-admin__label"
                htmlFor={`kadsamhsa-admin-blockurl-${lesson.id}`}
              >
                URL
              </label>
              <input
                id={`kadsamhsa-admin-blockurl-${lesson.id}`}
                className="kadsamhsa-admin__input"
                value={draft.url}
                onChange={(event) => onDraftChange({ url: event.target.value })}
                placeholder="https://…"
              />
            </div>
          )}

          {draftShape === 'media' && (
            <div className="kadsamhsa-admin__field">
              <label
                className="kadsamhsa-admin__label"
                htmlFor={`kadsamhsa-admin-blockprovider-${lesson.id}`}
              >
                Provider (optional)
              </label>
              <input
                id={`kadsamhsa-admin-blockprovider-${lesson.id}`}
                className="kadsamhsa-admin__input"
                value={draft.provider}
                onChange={(event) => onDraftChange({ provider: event.target.value })}
                placeholder="youtube"
              />
            </div>
          )}

          {draftShape === 'file' && (
            <div className="kadsamhsa-admin__field">
              <label
                className="kadsamhsa-admin__label"
                htmlFor={`kadsamhsa-admin-blockfile-${lesson.id}`}
              >
                File name (optional)
              </label>
              <input
                id={`kadsamhsa-admin-blockfile-${lesson.id}`}
                className="kadsamhsa-admin__input"
                value={draft.filename}
                onChange={(event) => onDraftChange({ filename: event.target.value })}
                placeholder="handbook.pdf"
              />
            </div>
          )}

          {draftShape === 'quiz' && (
            <div className="kadsamhsa-admin__field">
              <label
                className="kadsamhsa-admin__label"
                htmlFor={`kadsamhsa-admin-blockquiz-${lesson.id}`}
              >
                Quiz
              </label>
              {quizzes.length > 0 ? (
                <select
                  id={`kadsamhsa-admin-blockquiz-${lesson.id}`}
                  className="kadsamhsa-admin__select"
                  value={draft.quizId}
                  onChange={(event) => onDraftChange({ quizId: event.target.value })}
                >
                  <option value="">Choose a quiz…</option>
                  {quizzes.map((quiz) => (
                    <option key={quiz.id} value={quiz.id}>
                      {quiz.title}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input
                    id={`kadsamhsa-admin-blockquiz-${lesson.id}`}
                    className="kadsamhsa-admin__input"
                    value={draft.quizId}
                    onChange={(event) => onDraftChange({ quizId: event.target.value })}
                    placeholder="Quiz id"
                  />
                  <p className="kadsamhsa-admin__hint">
                    No quizzes are listed for this course. Paste the quiz id, or create the quiz
                    first.
                  </p>
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            className="kadsamhsa-admin__btn kadsamhsa-admin__btn--primary"
            disabled={busy}
          >
            Add block
          </button>
        </form>
      )}
    </li>
  );
}
