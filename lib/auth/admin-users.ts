import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function findUserIdByEmail(admin: AdminClient, email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return null;
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const match = data.users.find((user) => user.email?.toLowerCase() === normalized);
    if (match) return match.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

export async function listUserEmails(admin: AdminClient) {
  const emails = new Map<string, string>();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    for (const user of data.users) {
      emails.set(user.id, user.email ?? "");
    }
    if (data.users.length < 200) break;
  }
  return emails;
}
