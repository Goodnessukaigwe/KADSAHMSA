/**
 * Admin backend contracts (PRD §4.2 Gurucan model, A1–A8).
 *
 * These shapes back the staff-facing course builder, learner CRM and payment
 * reconciliation views. Every endpoint serving them is permission-checked in
 * the API; nothing here is reachable by a learner role.
 */
import type { CourseStatus, PriceType, QuestionType, QuizKind } from './index';

export interface AdminCourseSummary {
  id: string;
  slug: string;
  title: string;
  status: CourseStatus;
  priceType: PriceType;
  priceAmount: number | null;
  currency: string;
  isFeatured: boolean;
  moduleCount: number;
  lessonCount: number;
  enrolmentCount: number;
  publishedAt: string | null;
  updatedAt: string;
}

export interface AdminContentBlock {
  id: string;
  type: 'rich_text' | 'video' | 'audio' | 'image' | 'pdf' | 'slides' | 'download' | 'quiz';
  position: number;
  /**
   * Type-dependent: `{ html }` for rich_text, `{ url, provider }` for video,
   * `{ url, filename }` for pdf/slides/download, `{ quizId }` for quiz.
   */
  payload: Record<string, unknown>;
}

export interface AdminLesson {
  id: string;
  title: string;
  position: number;
  durationMinutes: number | null;
  isRequired: boolean;
  blocks: AdminContentBlock[];
}

export interface AdminModule {
  id: string;
  title: string;
  position: number;
  lessons: AdminLesson[];
  quizId: string | null;
}

export interface AdminCourseDetail extends AdminCourseSummary {
  summary: string;
  description: string;
  objectives: string[];
  coverImageUrl: string | null;
  categoryId: string | null;
  passMarkPercent: number;
  certificateEnabled: boolean;
  durationMinutes: number | null;
  modules: AdminModule[];
}

/** A question with its answer key — staff-only. */
export interface AdminQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  feedback: string;
  position: number;
  options: {
    id: string;
    label: string;
    isCorrect: boolean;
    matchKey: string | null;
    position: number;
  }[];
}

export interface AdminQuiz {
  id: string;
  courseId: string;
  moduleId: string | null;
  title: string;
  kind: QuizKind;
  passMarkPercent: number;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
  questionCount: number | null;
  randomise: boolean;
  questions: AdminQuestion[];
}

/** A learner enrolled on a course, for the CRM view (PRD A6). */
export interface AdminEnrolledLearner {
  userId: string;
  enrolmentId: string;
  fullName: string;
  email: string;
  status: 'active' | 'completed' | 'cancelled';
  enrolledAt: string;
  completedAt: string | null;
  progressPercent: number;
  lessonsCompleted: number;
  lessonsTotal: number;
  finalScorePercent: number | null;
  certificateVerificationId: string | null;
}

export interface AdminOffer {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceAmount: number;
  currency: string;
  status: 'draft' | 'active' | 'archived';
  seatCount: number | null;
  courseIds: string[];
}

/** A payment row for reconciliation (PRD A8, "see who has paid"). */
export interface AdminPayment {
  orderId: string;
  reference: string;
  learnerName: string;
  learnerEmail: string;
  offerName: string;
  amount: number;
  currency: string;
  orderStatus: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'succeeded' | 'failed' | 'refunded' | null;
  channel: string | null;
  paidAt: string | null;
  createdAt: string;
}

/** Platform-wide counters for the admin dashboard (PRD A8). */
export interface AdminOverview {
  learners: number;
  publishedCourses: number;
  draftCourses: number;
  enrolments: number;
  completions: number;
  certificatesIssued: number;
  revenueMinor: number;
  currency: string;
}
