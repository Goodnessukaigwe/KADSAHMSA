import "server-only";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";

export type EnrolResult = { ok: true } | { ok: false; error: string };

function fail(error: string): EnrolResult {
  return { ok: false, error };
}

const UUID = /^[0-9a-f-]{36}$/i;

function revalidateEnrolment(userId: string, courseSlug: string) {
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseSlug}`);
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/reports");
  revalidatePath("/org");
  revalidatePath("/my");
  revalidatePath("/my/courses");
  revalidatePath(`/courses/${courseSlug}`);
  revalidatePath(`/learn/${courseSlug}`);
}

/** Service-role enrol. Callers must already have passed requireStaff / requireOrgAdmin. */
export async function enrolLearnerWithAdmin(
  userId: string,
  courseSlug: string
): Promise<EnrolResult> {
  if (!UUID.test(userId)) {
    return fail("That account id is not a registered learner.");
  }

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, slug")
    .eq("slug", courseSlug)
    .maybeSingle();
  if (!course) return fail("That course was not found.");

  const { data: profile } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (!profile) return fail("That learner was not found.");

  const { error: enrolError } = await admin.from("enrolments").insert({
    user_id: userId,
    course_id: course.id,
  });
  if (enrolError?.code === "23505") {
    const { error: reactivateError } = await admin
      .from("enrolments")
      .update({ status: "active", unenrolled_at: null })
      .eq("user_id", userId)
      .eq("course_id", course.id);
    if (reactivateError) {
      return fail(reactivateError.message || "Could not enrol this learner.");
    }
  } else if (enrolError) {
    return fail(enrolError.message || "Could not enrol this learner.");
  }

  const { error: progressError } = await admin.from("course_progress").insert({
    user_id: userId,
    course_id: course.id,
    current_module: 1,
    completed_indexes: [],
    player_seconds: 0,
  });
  if (progressError && progressError.code !== "23505") {
    return fail(progressError.message || "Could not start progress for this learner.");
  }

  const { error: requestError } = await admin
    .from("enrolment_requests")
    .delete()
    .eq("user_id", userId)
    .eq("course_id", course.id);
  if (
    requestError &&
    !requestError.message?.includes("enrolment_requests") &&
    !requestError.message?.includes("schema cache")
  ) {
    return fail(requestError.message || "Could not clear the enrolment request.");
  }

  revalidateEnrolment(userId, course.slug);
  return { ok: true };
}

/** Service-role unenrol. Marks the seat inactive; does not delete the row. */
export async function unenrolLearnerWithAdmin(
  userId: string,
  courseSlug: string
): Promise<EnrolResult> {
  if (!UUID.test(userId)) {
    return fail("That account id is not a registered learner.");
  }

  const admin = createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("id, slug")
    .eq("slug", courseSlug)
    .maybeSingle();
  if (!course) return fail("That course was not found.");

  const { data: seat } = await admin
    .from("enrolments")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", course.id)
    .eq("status", "active")
    .maybeSingle();
  if (!seat) return fail("This learner is not enrolled on that course.");

  const { error } = await admin
    .from("enrolments")
    .update({ status: "unenrolled", unenrolled_at: new Date().toISOString() })
    .eq("id", seat.id);
  if (error) return fail(error.message || "Could not unenrol this learner.");

  revalidateEnrolment(userId, course.slug);
  return { ok: true };
}
