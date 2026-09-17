import { NextResponse } from "next/server";

import { resolveWorkingCoverUrl } from "@/lib/courses/cover";
import { isPublicCoverPath } from "@/lib/courses/media";
import { isStaffUser } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const trimmed = slug?.trim() ?? "";
  if (!trimmed) {
    return new NextResponse(null, { status: 404 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return new NextResponse(null, { status: 404 });
  }

  const { data: course } = await admin
    .from("courses")
    .select("id, cover_path, status")
    .eq("slug", trimmed)
    .maybeSingle();

  if (!course) {
    return new NextResponse(null, { status: 404 });
  }

  if (course.status !== "published" && !(await isStaffUser())) {
    return new NextResponse(null, { status: 404 });
  }

  const coverUrl = await resolveWorkingCoverUrl(
    admin,
    course.id,
    course.cover_path
  );
  if (!coverUrl) {
    return new NextResponse(null, { status: 404 });
  }

  const target =
    isPublicCoverPath(coverUrl) && coverUrl.startsWith("/")
      ? new URL(coverUrl, request.url)
      : coverUrl;
  return NextResponse.redirect(target);
}
