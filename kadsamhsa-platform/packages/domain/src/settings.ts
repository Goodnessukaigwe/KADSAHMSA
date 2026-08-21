/** School settings (PRD A9) and certificate templates (PRD A4). */

export interface SchoolSettings {
  siteName: string;
  tagline: string;
  logoUrl: string | null;
  primaryColour: string;
  accentColour: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  customDomain: string | null;
  supportUrl: string | null;
  updatedAt: string;
}

export interface CertificateTemplate {
  id: string;
  courseId: string | null;
  name: string;
  title: string;
  /**
   * Supports `{{learner_name}}`, `{{course_title}}`, `{{issue_date}}` and
   * `{{verification_id}}`. Kept as a template string rather than assembled
   * server-side so staff can reword certificates without a deploy (PRD A4).
   */
  body: string;
  backgroundUrl: string | null;
  logoUrl: string | null;
  signatoryOne: string;
  signatoryOneTitle: string;
  signatoryTwo: string;
  signatoryTwoTitle: string;
}

/** A row in the admin certificate register (wireframe: Certificates section). */
export interface AdminCertificate {
  id: string;
  verificationId: string;
  learnerName: string;
  learnerEmail: string;
  courseTitle: string;
  courseId: string;
  scorePercent: number | null;
  status: 'valid' | 'revoked';
  issuedAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

/** A row in the admin user list (PRD A6, "CRM-style view"). */
export interface AdminUserSummary {
  id: string;
  fullName: string;
  email: string;
  roles: string[];
  status: 'active' | 'suspended' | 'deleted';
  emailVerified: boolean;
  enrolmentCount: number;
  completionCount: number;
  certificateCount: number;
  createdAt: string;
}

export interface AdminUserDetail extends AdminUserSummary {
  enrolments: {
    enrolmentId: string;
    courseId: string;
    courseTitle: string;
    status: string;
    progressPercent: number;
    enrolledAt: string;
    completedAt: string | null;
  }[];
  certificates: {
    id: string;
    verificationId: string;
    courseTitle: string;
    status: 'valid' | 'revoked';
    issuedAt: string;
  }[];
  payments: {
    reference: string;
    offerName: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }[];
}
