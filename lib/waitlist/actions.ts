"use server";

import { revalidatePath } from "next/cache";

import { notifyWaitlistJoined } from "@/lib/email/notify";
import { requireStaff } from "@/lib/permissions";
import { findUserIdByEmail } from "@/lib/auth/admin-users";
import { enrolLearnerWithAdmin } from "@/lib/courses/enrol";
import { createAdminClient } from "@/lib/supabase/admin";

export type WaitlistInput = {
  courseSlug: string;
  name: string;
  email: string;
  phone: string;
  organisation: string;
  note: string;
  /** Hidden field: real visitors leave it empty, form-filling bots do not. */
  website: string;
};

export type WaitlistResult = { ok: true } | { ok: false; error: string };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const clip = (text: string, max: number) => text.trim().slice(0, max);

/** Open to everyone, signed in or not. Saving the same email twice is harmless. */
export async function joinWaitlist(input: WaitlistInput): Promise<WaitlistResult> {
  if (input.website.trim()) return { ok: true }; // a bot: pretend it worked, store nothing
  const name = clip(input.name, 120);
  const email = clip(input.email, 200).toLowerCase();
  if (name.length < 2) return { ok: false, error: "Please enter your full name." };
  if (!EMAIL.test(email)) return { ok: false, error: "Please enter a valid email address." };

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, title, slug, status")
    .eq("slug", input.courseSlug)
    .maybeSingle();
  if (!course || course.status !== "published") {
    return { ok: false, error: "That course is not available right now." };
  }

  const { data: existing } = await admin
    .from("course_waitlist")
    .select("id")
    .eq("course_id", course.id)
    .eq("email", email)
    .maybeSingle();

  const { error } = await admin.from("course_waitlist").upsert(
    {
      course_id: course.id,
      name,
      email,
      phone: clip(input.phone, 40),
      organisation: clip(input.organisation, 160),
      note: clip(input.note, 1000),
    },
    { onConflict: "course_id,email" }
  );
  if (error) return { ok: false, error: "Could not save your details. Please try again." };

  if (!existing) {
    await notifyWaitlistJoined({ email, name, courseTitle: course.title, courseSlug: course.slug });
  }
  revalidatePath(`/admin/courses/${course.slug}/analytics`);
  return { ok: true };
}

/** Staff only: give a waitlisted person free access (they must have registered). */
export async function giveWaitlistAccess(
  waitlistId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireStaff();
  const admin = createAdminClient();
  const { data: entry } = await admin
    .from("course_waitlist")
    .select("id, email, course_id")
    .eq("id", waitlistId)
    .maybeSingle();
  if (!entry) return { ok: false, error: "That waitlist entry was not found." };
  const { data: course } = await admin.from("courses").select("slug").eq("id", entry.course_id).maybeSingle();
  if (!course) return { ok: false, error: "That course was not found." };

  const userId = await findUserIdByEmail(admin, entry.email);
  if (!userId) {
    return { ok: false, error: "They have not registered yet. Ask them to sign up with this email, then try again." };
  }
  const result = await enrolLearnerWithAdmin(userId, course.slug);
  if (!result.ok) return { ok: false, error: result.error };
  await admin.from("course_waitlist").update({ status: "invited" }).eq("id", entry.id);
  revalidatePath(`/admin/courses/${course.slug}/analytics`);
  return { ok: true };
}
