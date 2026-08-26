import { createClient } from "@/lib/supabase/client";

export function createBrowserClientOrNull() {
  try {
    return createClient();
  } catch {
    return null;
  }
}
