import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { applySecurityHeaders } from "@/lib/security-headers";

const PROTECTED_PREFIXES = [
  "/my",
  "/learn",
  "/certificates",
  "/admin",
  "/org",
  "/join",
  "/quiz",
  "/help",
];

const AUTH_PAGES = ["/login", "/register"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isStaff(roles: string[]) {
  return roles.some((role) => role === "content_admin" || role === "super_admin");
}

function safeNextPath(pathname: string, search: string) {
  const next = `${pathname}${search}`;
  if (next.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/my";
}

function secured(response: NextResponse) {
  applySecurityHeaders(response.headers);
  return response;
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname, search } = request.nextUrl;

  if (!url || !anonKey) {
    if (isProtectedPath(pathname)) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.search = "";
      login.searchParams.set("next", safeNextPath(pathname, search));
      return secured(NextResponse.redirect(login));
    }
    return secured(NextResponse.next({ request }));
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(pathname)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("next", safeNextPath(pathname, search));
    return secured(NextResponse.redirect(login));
  }

  if (user && AUTH_PAGES.includes(pathname)) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", user.id);
    const roles = (roleRows ?? []).map((row) => row.role_id);
    const home = request.nextUrl.clone();
    home.pathname = isStaff(roles)
      ? "/admin"
      : roles.some((role) => role === "org_admin")
        ? "/org"
        : "/my";
    home.search = "";
    return secured(NextResponse.redirect(home));
  }

  if (user && (pathname === "/admin" || pathname.startsWith("/admin/"))) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", user.id);
    const roles = (roleRows ?? []).map((row) => row.role_id);
    if (!isStaff(roles)) {
      const learnerHome = request.nextUrl.clone();
      learnerHome.pathname = "/my";
      learnerHome.search = "";
      return secured(NextResponse.redirect(learnerHome));
    }
  }

  if (user && (pathname === "/org" || pathname.startsWith("/org/"))) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role_id")
      .eq("user_id", user.id);
    const roles = (roleRows ?? []).map((row) => row.role_id);
    const canOpenOrg =
      isStaff(roles) || roles.some((role) => role === "org_admin");
    if (!canOpenOrg) {
      const learnerHome = request.nextUrl.clone();
      learnerHome.pathname = "/my";
      learnerHome.search = "";
      return secured(NextResponse.redirect(learnerHome));
    }
  }

  return secured(supabaseResponse);
}
