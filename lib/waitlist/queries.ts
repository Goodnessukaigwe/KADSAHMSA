import "server-only";

import { requireStaff } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  organisation: string;
  note: string;
  status: "waiting" | "invited";
  createdAt: string;
};

/** Staff only. `ready` is false until the course_waitlist table exists. */
export async function listWaitlist(courseSlug: string) {
  await requireStaff();
  const admin = createAdminClient();
  const { data: course } = await admin.from("courses").select("id").eq("slug", courseSlug).maybeSingle();
  if (!course) return { ready: true, entries: [] as WaitlistEntry[] };
  const { data, error } = await admin
    .from("course_waitlist")
    .select("*")
    .eq("course_id", course.id)
    .order("created_at", { ascending: true });
  if (error) return { ready: false, entries: [] as WaitlistEntry[] };
  return {
    ready: true,
    entries: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      organisation: row.organisation,
      note: row.note,
      status: row.status,
      createdAt: row.created_at,
    })),
  };
}
