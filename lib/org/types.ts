export type OrgStatus = "pending" | "approved" | "rejected";
export type OrgMemberRole = "member" | "admin";

export type OrgSummary = {
  id: string;
  name: string;
  status: OrgStatus;
  seatLimit: number;
  seatsUsed: number;
  createdAt: string;
};

export type OrgMemberRow = {
  userId: string;
  name: string;
  email: string;
  role: OrgMemberRole;
  joined: string;
  courseTitle: string;
  courseSlug: string;
  completed: number;
  total: number;
  quizResult: "pass" | "fail" | "none";
  certificate: "issued" | "revoked" | "none";
};

export type OrgInviteRow = {
  id: string;
  code: string;
  courseTitle: string | null;
  uses: number;
  maxUses: number | null;
  expiresAt: string | null;
  createdAt: string;
};

export type OrgDetail = {
  org: OrgSummary;
  members: OrgMemberRow[];
  invites: OrgInviteRow[];
  courses: { id: string; slug: string; title: string }[];
};

export type OrgOption = {
  id: string;
  name: string;
  status: OrgStatus;
};

export type ReportRow = {
  userId: string;
  name: string;
  email: string;
  organisationName: string;
  organisationId: string | null;
  courseTitle: string;
  courseSlug: string;
  enrolledAt: string;
  completed: number;
  total: number;
  quizResult: "pass" | "fail" | "none";
  certificate: "issued" | "revoked" | "none";
};

export type LearnerOrgMembership = {
  organisationId: string;
  name: string;
  role: OrgMemberRole;
};
