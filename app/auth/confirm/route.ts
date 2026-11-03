import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNext(path: string | null) {
  if (path && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return "/my";
}

function destination(type: EmailOtpType, next: string) {
  if (type === "recovery") {
    return "/reset-password";
  }
  if (type === "email" || type === "signup") {
    return next;
  }
  return next;
}

/**
 * Email links open this route. It never uses the one-time token itself: mail scanners and link
 * previews follow links automatically and would use the token up, so the visitor lands on a page
 * with a button instead, and the token is only used when they press it (POST below).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=confirm`);
  }
  const next = safeNext(searchParams.get("next"));
  const target = new URL(`${origin}/continue`);
  target.searchParams.set("token_hash", token_hash);
  target.searchParams.set("type", type);
  target.searchParams.set("next", next);
  return NextResponse.redirect(target);
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const form = await request.formData();
  const token_hash = String(form.get("token_hash") ?? "");
  const type = String(form.get("type") ?? "") as EmailOtpType;
  const next = safeNext(String(form.get("next") ?? ""));

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=confirm`, 303);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=confirm`, 303);
  }

  return NextResponse.redirect(`${origin}${destination(type, next)}`, 303);
}
