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
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=callback`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
