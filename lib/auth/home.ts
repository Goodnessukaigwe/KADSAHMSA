import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database";

/** One Auth user can hold learner + super_admin. Staff land on /admin. */
export function homeFromRoles(roles: readonly string[]): string {
  if (roles.some((role) => role === "content_admin" || role === "super_admin")) {
    return "/admin";
  }
  if (roles.some((role) => role === "org_admin")) {
    return "/org";
  }
  return "/my";
}

export async function homeAfterSignIn(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string> {
  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", userId);

    return homeFromRoles((data ?? []).map((row) => row.role_id));
  } catch {
    return "/my";
  }
}
