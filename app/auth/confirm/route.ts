import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function safeNext(path: string | null) {
  if (path && path.startsWith("/") && !path.startsWith("//")) {
    return path;
  }
  return "/my";
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next"));

  if (!token_hash || !type) {
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash });
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
