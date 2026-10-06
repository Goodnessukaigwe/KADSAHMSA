import { createHash } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { visitorGet, visitorPost, type Deps } from "@/lib/help/engine";
import { notifyTeam } from "@/lib/help/notify";
import { supabaseStore, teamOnline } from "@/lib/help/store";
import { getAuthUser } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  return (forwarded?.split(",")[0] ?? request.headers.get("x-real-ip") ?? "unknown").trim();
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

function unavailable() {
  return NextResponse.json({ enabled: false }, { status: 503, headers: noStore });
}

/** The chat tab hides itself when the tables or keys are missing. */
function tryAdmin() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const admin = tryAdmin();
  if (!admin) return unavailable();
  try {
    const token = request.nextUrl.searchParams.get("token");
    if (token) {
      const deps = await buildDeps(request, admin);
      const result = await visitorGet(supabaseStore(admin), deps, token);
      return NextResponse.json(result.json, { status: result.status, headers: noStore });
    }
    const { error } = await admin.from("help_chats").select("id", { head: true, count: "exact" }).limit(1);
    if (error) return unavailable();
    return NextResponse.json(
      { enabled: true, team_online: await teamOnline(admin) },
      { headers: noStore }
    );
  } catch (cause) {
    console.error("help chat: GET", cause);
    return unavailable();
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const admin = tryAdmin();
  if (!admin) return unavailable();
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const deps = await buildDeps(request, admin);
    const result = await visitorPost(supabaseStore(admin), deps, body);
    return NextResponse.json(result.json, { status: result.status, headers: noStore });
  } catch (cause) {
    console.error("help chat: POST", cause);
    return NextResponse.json({ error: "server" }, { status: 500, headers: noStore });
  }
}

async function buildDeps(request: NextRequest, admin: ReturnType<typeof createAdminClient>): Promise<Deps> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const user = await getAuthUser().catch(() => null);
  return {
    notifyTeam: (chat, text, reason) => notifyTeam(admin, chat, text, reason),
    ipHash: createHash("sha256").update(`${clientIp(request)}|${key}`).digest("hex"),
    userId: user?.id ?? null,
    now: () => new Date(),
  };
}
