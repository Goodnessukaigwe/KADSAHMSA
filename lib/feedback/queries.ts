import "server-only";

import type { FeedbackTicket } from "@/lib/feedback/types";
import { requireStaff } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import type { FeedbackCategory, FeedbackTicketStatus } from "@/lib/supabase/database";

function isMissingFeedbackSchema(message: string | undefined) {
  if (!message) return false;
  return message.includes("feedback_tickets") || message.includes("schema cache");
}

function mapTicket(row: {
  id: string;
  created_at: string;
  user_id: string | null;
  submitter_name: string;
  submitter_email: string;
  is_anonymous: boolean;
  category: FeedbackCategory;
  message: string;
  page_path: string;
  status: FeedbackTicketStatus;
  read_at: string | null;
  resolved_at: string | null;
}): FeedbackTicket {
  return {
    id: row.id,
    createdAt: row.created_at,
    userId: row.user_id,
    submitterName: row.submitter_name,
    submitterEmail: row.submitter_email,
    isAnonymous: row.is_anonymous,
    category: row.category,
    message: row.message,
    pagePath: row.page_path,
    status: row.status,
    readAt: row.read_at,
    resolvedAt: row.resolved_at,
  };
}

export async function countUnreadFeedback(): Promise<number> {
  await requireStaff();
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("feedback_tickets")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) {
    if (isMissingFeedbackSchema(error.message)) return 0;
    return 0;
  }
  return count ?? 0;
}

export async function listFeedbackTickets(): Promise<FeedbackTicket[]> {
  await requireStaff();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedback_tickets")
    .select(
      "id, created_at, user_id, submitter_name, submitter_email, is_anonymous, category, message, page_path, status, read_at, resolved_at"
    )
    .order("created_at", { ascending: false });
  if (error) {
    if (isMissingFeedbackSchema(error.message)) return [];
    return [];
  }
  return (data ?? []).map(mapTicket);
}
