import type {
  FeedbackCategory,
  FeedbackTicketStatus,
} from "@/lib/supabase/database";

export type { FeedbackCategory, FeedbackTicketStatus };

export type FeedbackFilter = "all" | "new" | "open" | "resolved";

export type FeedbackTicket = {
  id: string;
  createdAt: string;
  userId: string | null;
  submitterName: string;
  submitterEmail: string;
  isAnonymous: boolean;
  category: FeedbackCategory;
  message: string;
  pagePath: string;
  status: FeedbackTicketStatus;
  readAt: string | null;
  resolvedAt: string | null;
};

export type SubmitFeedbackInput = {
  message: string;
  category: string;
  pagePath: string;
  website?: string;
};
