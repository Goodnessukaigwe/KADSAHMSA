"use server";

import { requireUser } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";

export type NoteResult =
  | { ok: true; body: string }
  | { ok: false; error: string; unavailable?: boolean };

const MAX = 10000;

function missingTable(message: string | undefined) {
  return Boolean(message && (message.includes("lesson_notes") || message.includes("schema cache")));
}

/** The learner's own note for one lesson page. */
export async function loadNote(courseSlug: string, lessonSlug: string): Promise<NoteResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lesson_notes")
    .select("body")
    .eq("user_id", user.id)
    .eq("course_slug", courseSlug)
    .eq("lesson_slug", lessonSlug)
    .maybeSingle();
  if (error) {
    return { ok: false, error: "Notes are not available.", unavailable: missingTable(error.message) };
  }
  return { ok: true, body: data?.body ?? "" };
}

export async function saveNote(
  courseSlug: string,
  lessonSlug: string,
  body: string
): Promise<NoteResult> {
  const user = await requireUser();
  const text = body.slice(0, MAX);
  const supabase = await createClient();
  const { error } = await supabase.from("lesson_notes").upsert(
    {
      user_id: user.id,
      course_slug: courseSlug,
      lesson_slug: lessonSlug,
      body: text,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,course_slug,lesson_slug" }
  );
  if (error) {
    return { ok: false, error: "Could not save your note.", unavailable: missingTable(error.message) };
  }
  return { ok: true, body: text };
}
