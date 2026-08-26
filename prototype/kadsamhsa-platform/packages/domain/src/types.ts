import type { Permission, Role } from './permissions';

export type CourseStatus = 'draft' | 'published' | 'archived';
export type PriceType = 'free' | 'paid';
export type EnrolmentStatus = 'active' | 'completed' | 'cancelled';
export type CertificateStatus = 'valid' | 'revoked';

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
  roles: Role[];
  permissions: Permission[];
  emailVerified: boolean;
}

export interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverImageUrl: string | null;
  priceType: PriceType;
  /** Minor units (kobo). Null for free courses. */
  priceAmount: number | null;
  currency: string;
  lessonCount: number;
  /** Estimated minutes; null when not yet set by a content admin. */
  durationMinutes: number | null;
  categoryName: string | null;
}

export interface CourseDetail extends CourseSummary {
  description: string;
  objectives: string[];
  modules: ModuleOutline[];
  certificateAvailable: boolean;
  passMarkPercent: number;
}

export interface ModuleOutline {
  id: string;
  title: string;
  position: number;
  lessons: LessonOutline[];
}

export interface LessonOutline {
  id: string;
  title: string;
  position: number;
  durationMinutes: number | null;
}

export interface Enrolment {
  id: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  coverImageUrl: string | null;
  status: EnrolmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  /** 0–100, derived from completed lessons over total lessons. */
  progressPercent: number;
  lessonsCompleted: number;
  lessonsTotal: number;
}

/**
 * An enrolment presented as a "continue learning" card: the progress plus the
 * pre-formatted labels the dashboard design shows (module line, price,
 * duration).
 */
export interface ContinueCourse {
  enrolmentId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  coverImageUrl: string | null;
  progressPercent: number;
  /** 1-based index of the first module still holding an incomplete lesson. */
  moduleCurrent: number;
  moduleTotal: number;
  priceLabel: string;
  durationLabel: string;
}

export interface LearnerDashboard {
  user: PublicUser;
  /** False for a learner with no enrolments — drives the first-time hero. */
  hasStarted: boolean;
  /** Most recently enrolled active course, or null when hasStarted is false. */
  continueCourse: ContinueCourse | null;
  /** Other active enrolments, shown under "You also started these courses". */
  alsoStarted: ContinueCourse[];
  /** Published courses the learner is not enrolled in. */
  exploreCourses: CourseSummary[];
  /**
   * The course pitched in the first-time hero — an editorially featured one,
   * falling back to the first explore course. Null once nothing is left to
   * recommend.
   */
  featuredCourse: CourseSummary | null;
  enrolments: Enrolment[];
  certificates: CertificateSummary[];
  /** Suppresses the first-run onboarding card once dismissed. */
  onboardingDismissed: boolean;
  stats: {
    coursesInProgress: number;
    coursesCompleted: number;
    certificatesEarned: number;
  };
}

export interface CertificateSummary {
  id: string;
  verificationId: string;
  courseTitle: string;
  issuedAt: string;
  status: CertificateStatus;
  downloadUrl: string | null;
}

/**
 * A learner's own certificate, with the per-course template already applied —
 * placeholders substituted server-side so the view never has to know the
 * template syntax.
 */
export interface LearnerCertificate {
  id: string;
  verificationId: string;
  learnerName: string;
  courseTitle: string;
  scorePercent: number | null;
  status: CertificateStatus;
  issuedAt: string;
  title: string;
  body: string;
  backgroundUrl: string | null;
  logoUrl: string | null;
  signatories: { name: string; title: string }[];
}

/**
 * Public verification response. Deliberately minimal — PRD §7.3 limits this to
 * validity, learner name, course title and issue date.
 */
export interface CertificateVerification {
  verificationId: string;
  status: CertificateStatus | 'not_found';
  learnerName: string | null;
  courseTitle: string | null;
  issuedAt: string | null;
}

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  expiresIn: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
