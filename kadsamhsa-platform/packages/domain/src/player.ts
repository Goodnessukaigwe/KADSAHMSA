/**
 * Course player contracts (PRD F4; wireframe screen 6).
 *
 * The player is the only learner surface that returns lesson *content*, so
 * everything here is gated on an active enrolment server-side. Locked lessons
 * come back with `blocks: null` — the outline is visible pre-enrolment by
 * design, the content is not.
 */

export type ContentBlockType =
  | 'rich_text'
  | 'video'
  | 'audio'
  | 'image'
  | 'pdf'
  | 'slides'
  | 'download'
  | 'quiz';

export interface PlayerBlock {
  id: string;
  type: ContentBlockType;
  position: number;
  /**
   * Type-dependent, mirroring what the builder writes:
   * `{ html }` | `{ url, provider?, title? }` | `{ quizId }`.
   */
  payload: Record<string, unknown>;
}

export interface PlayerLesson {
  id: string;
  title: string;
  position: number;
  durationMinutes: number | null;
  isRequired: boolean;
  completed: boolean;
  /** Seconds consumed, used to resume mid-video. */
  positionSeconds: number;
}

export interface PlayerModule {
  id: string;
  title: string;
  position: number;
  lessons: PlayerLesson[];
  /** The module's quiz, if it has one. */
  quiz: { id: string; title: string; passed: boolean; unlocked: boolean } | null;
  /**
   * Sequential unlock (wireframe screen 6): a module opens once the previous
   * module's required lessons are done and its quiz, if any, is passed.
   */
  locked: boolean;
}

export interface PlayerOutline {
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  enrolmentId: string;
  progressPercent: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  modules: PlayerModule[];
  /** Where "Resume" goes: last opened, else first incomplete, else first. */
  resumeLessonId: string | null;
  finalQuiz: { id: string; title: string; passed: boolean; unlocked: boolean } | null;
  certificateVerificationId: string | null;
}

export interface PlayerLessonContent {
  lesson: PlayerLesson;
  moduleId: string;
  moduleTitle: string;
  blocks: PlayerBlock[];
  previousLessonId: string | null;
  nextLessonId: string | null;
  /** Set when the next step after this lesson is a quiz rather than a lesson. */
  nextQuizId: string | null;
}
