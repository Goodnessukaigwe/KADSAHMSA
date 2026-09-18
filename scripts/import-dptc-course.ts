/**
 * DPTC course importer.
 *
 * Reads scripts/dptc/dptc-course.generated.json (produced by
 * scripts/dptc/extract.py) and upserts it into the hosted Supabase project as
 * a normal, fully admin-editable course at slug "dptc-course" (NOT "dptc" --
 * see the plan doc for why). Also ensures the super-admin account exists and
 * is granted the super_admin role. Safe to re-run: it prunes any stale
 * modules/lessons/quizzes/questions from a previous run before publishing.
 *
 * Run command (from repo root):
 *
 *     npm run import:dptc
 *
 * (equivalent to: npx tsx scripts/import-dptc-course.ts)
 *
 * This script loads env vars itself (NEXT_PUBLIC_SUPABASE_URL,
 * SUPABASE_SERVICE_ROLE_KEY) from .env.local / .env at the repo root -- no
 * `dotenv` package is installed, and Node 18 (the version installed here)
 * does not support `--env-file`, so we parse the file with a tiny inline
 * parser instead. It does NOT import lib/supabase/admin.ts or
 * lib/permissions.ts (both have `import "server-only"` at the top, which
 * throws when run outside a Next.js request) -- it builds its own
 * service-role client inline.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database";

// Node 18 (the version installed in this environment) has no global
// WebSocket, but @supabase/supabase-js unconditionally spins up a realtime
// client (which we never use here) that requires one. Polyfill it with the
// `ws` package before importing supabase-js's *value* export. Harmless
// no-op on Node 22+, which does have a native WebSocket. This has to happen
// inside an async function (not top-level await) because tsx transforms
// this file as CommonJS.
async function loadCreateClient() {
  if (typeof globalThis.WebSocket === "undefined") {
    const { WebSocket } = await import("ws");
    // @ts-expect-error -- polyfilling a global for the Node 18 runtime
    globalThis.WebSocket = WebSocket;
  }
  const { createClient } = await import("@supabase/supabase-js");
  return createClient;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Tiny .env parser (no `dotenv` dependency)
// ---------------------------------------------------------------------------

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(REPO_ROOT, ".env.local"));
loadEnvFile(resolve(REPO_ROOT, ".env"));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (checked .env.local and .env)."
  );
  process.exit(1);
}

let supabase: SupabaseClient<Database>;

// ---------------------------------------------------------------------------
// Generated JSON shape
// ---------------------------------------------------------------------------

type GeneratedQuestion = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

type GeneratedLesson = {
  position: number;
  slug: string;
  title: string;
  main: string;
  durationLabel: string;
};

type GeneratedModule = {
  position: number;
  slug: string;
  title: string;
  lessons: GeneratedLesson[];
  quizQuestions: GeneratedQuestion[];
};

type GeneratedCourse = {
  course: {
    slug: string;
    title: string;
    summary: string;
    durationLabel: string;
  };
  modules: GeneratedModule[];
  finalQuestions: GeneratedQuestion[];
};

const COURSE_SLUG: string = "dptc-course";
if (COURSE_SLUG === "dptc") {
  // Guard against ever accidentally reintroducing the landmine slug.
  throw new Error("Refusing to use slug 'dptc' -- see plan doc for why.");
}

const SUPER_ADMIN_EMAIL = "goodnessukaigwe2020@gmail.com";
const SUPER_ADMIN_PASSWORD = "12345678";

function loadGeneratedCourse(): GeneratedCourse {
  const path = resolve(REPO_ROOT, "scripts/dptc/dptc-course.generated.json");
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path} -- run the extractor first: scripts/dptc/.venv/bin/python3 scripts/dptc/extract.py`
    );
  }
  return JSON.parse(readFileSync(path, "utf8")) as GeneratedCourse;
}

// ---------------------------------------------------------------------------
// Super admin
// ---------------------------------------------------------------------------

async function ensureSuperAdmin(): Promise<{ userId: string; created: boolean }> {
  let userId: string | null = null;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const match = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase()
    );
    if (match) {
      userId = match.id;
      break;
    }
    if (data.users.length < 200) break;
  }

  let created = false;
  if (!userId) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`createUser failed: ${error?.message ?? "unknown error"}`);
    }
    userId = data.user.id;
    created = true;
  }

  const { error: roleError } = await supabase
    .from("user_roles")
    .upsert({ user_id: userId, role_id: "super_admin" }, { onConflict: "user_id,role_id" });
  if (roleError && !/duplicate key|already exists/i.test(roleError.message)) {
    throw new Error(`Could not grant super_admin role: ${roleError.message}`);
  }

  return { userId, created };
}

// ---------------------------------------------------------------------------
// Course / modules / lessons
// ---------------------------------------------------------------------------

async function upsertCourse(generated: GeneratedCourse): Promise<string> {
  const { data: existing } = await supabase
    .from("courses")
    .select("id")
    .eq("slug", COURSE_SLUG)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("courses")
      .update({
        title: generated.course.title,
        summary: generated.course.summary,
        duration_label: generated.course.durationLabel,
      })
      .eq("id", existing.id);
    if (error) throw new Error(`Could not update course: ${error.message}`);
    return existing.id;
  }

  const { data, error } = await supabase
    .from("courses")
    .insert({
      slug: COURSE_SLUG,
      title: generated.course.title,
      status: "draft",
      summary: generated.course.summary,
      duration_label: generated.course.durationLabel,
      cover_path: "",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not create course: ${error?.message}`);
  return data.id;
}

async function upsertModulesAndLessons(
  courseId: string,
  modules: GeneratedModule[]
): Promise<{ moduleIdByPosition: Map<number, string>; lessonCount: number }> {
  const { data: existingModules, error: moduleReadError } = await supabase
    .from("course_modules")
    .select("id, slug, position")
    .eq("course_id", courseId);
  if (moduleReadError) throw new Error(`Could not read course_modules: ${moduleReadError.message}`);

  const { data: existingLessons, error: lessonReadError } = await supabase
    .from("course_lessons")
    .select("id, slug, module_id")
    .eq("course_id", courseId);
  if (lessonReadError) throw new Error(`Could not read course_lessons: ${lessonReadError.message}`);

  const moduleBySlug = new Map((existingModules ?? []).map((row) => [row.slug, row]));
  const moduleIdByPosition = new Map<number, string>();
  const usedModuleIds = new Set<string>();

  for (const module of modules) {
    const existing = moduleBySlug.get(module.slug);
    if (existing) {
      const { error } = await supabase
        .from("course_modules")
        .update({ position: module.position, title: module.title })
        .eq("id", existing.id);
      if (error) throw new Error(`Could not update module ${module.slug}: ${error.message}`);
      moduleIdByPosition.set(module.position, existing.id);
      usedModuleIds.add(existing.id);
    } else {
      const { data, error } = await supabase
        .from("course_modules")
        .insert({
          course_id: courseId,
          position: module.position,
          slug: module.slug,
          title: module.title,
        })
        .select("id")
        .single();
      if (error || !data) throw new Error(`Could not insert module ${module.slug}: ${error?.message}`);
      moduleIdByPosition.set(module.position, data.id);
      usedModuleIds.add(data.id);
    }
  }

  // Prune stale modules (and, via FK cascade, their lessons/quizzes) from a
  // previous run whose slug no longer exists in the generated set.
  const staleModuleIds = (existingModules ?? [])
    .filter((row) => !usedModuleIds.has(row.id))
    .map((row) => row.id);
  if (staleModuleIds.length) {
    const { error } = await supabase.from("course_modules").delete().in("id", staleModuleIds);
    if (error) throw new Error(`Could not prune stale modules: ${error.message}`);
  }

  const lessonBySlug = new Map((existingLessons ?? []).map((row) => [row.slug, row]));
  const usedLessonIds = new Set<string>();
  let lessonCount = 0;

  for (const module of modules) {
    const moduleId = moduleIdByPosition.get(module.position);
    if (!moduleId) continue;
    for (const lesson of module.lessons) {
      lessonCount += 1;
      const existing = lessonBySlug.get(lesson.slug);
      const row = {
        course_id: courseId,
        module_id: moduleId,
        position: lesson.position,
        slug: lesson.slug,
        title: lesson.title,
        status: "live" as const,
        duration_label: lesson.durationLabel,
        introduction: "",
        main: lesson.main,
        notes: "",
      };
      if (existing) {
        const { error } = await supabase.from("course_lessons").update(row).eq("id", existing.id);
        if (error) throw new Error(`Could not update lesson ${lesson.slug}: ${error.message}`);
        usedLessonIds.add(existing.id);
      } else {
        const { data, error } = await supabase.from("course_lessons").insert(row).select("id").single();
        if (error || !data) throw new Error(`Could not insert lesson ${lesson.slug}: ${error?.message}`);
        usedLessonIds.add(data.id);
      }
    }
  }

  const staleLessonIds = (existingLessons ?? [])
    .filter((row) => !usedLessonIds.has(row.id))
    .map((row) => row.id);
  if (staleLessonIds.length) {
    const { error } = await supabase.from("course_lessons").delete().in("id", staleLessonIds);
    if (error) throw new Error(`Could not prune stale lessons: ${error.message}`);
  }

  return { moduleIdByPosition, lessonCount };
}

// ---------------------------------------------------------------------------
// Quizzes / questions
// ---------------------------------------------------------------------------

async function replaceQuizQuestions(quizId: string, questions: GeneratedQuestion[]) {
  const { error: deleteError } = await supabase.from("quiz_questions").delete().eq("quiz_id", quizId);
  if (deleteError) throw new Error(`Could not clear quiz_questions: ${deleteError.message}`);
  if (!questions.length) return;
  const { error: insertError } = await supabase.from("quiz_questions").insert(
    questions.map((q, index) => ({
      quiz_id: quizId,
      position: index + 1,
      prompt: q.prompt,
      options: q.options,
      correct_index: q.correctIndex,
    }))
  );
  if (insertError) throw new Error(`Could not insert quiz_questions: ${insertError.message}`);
}

async function upsertModuleQuizzes(
  courseId: string,
  modules: GeneratedModule[],
  moduleIdByPosition: Map<number, string>
): Promise<{ quizCount: number; questionCount: number }> {
  const { data: existingQuizzes, error } = await supabase
    .from("quizzes")
    .select("id, slug, module_id")
    .eq("course_id", courseId)
    .eq("kind", "module");
  if (error) throw new Error(`Could not read module quizzes: ${error.message}`);

  const quizBySlug = new Map((existingQuizzes ?? []).map((row) => [row.slug, row]));
  const usedQuizIds = new Set<string>();
  let quizCount = 0;
  let questionCount = 0;

  for (const module of modules) {
    const moduleId = moduleIdByPosition.get(module.position);
    if (!moduleId) continue;
    const slug = `module-${module.position}`;
    const existing = quizBySlug.get(slug);
    let quizId: string;
    if (existing) {
      const { error: updateError } = await supabase
        .from("quizzes")
        .update({ module_id: moduleId, pass_mark_percent: 80 })
        .eq("id", existing.id);
      if (updateError) throw new Error(`Could not update module quiz ${slug}: ${updateError.message}`);
      quizId = existing.id;
    } else {
      const { data, error: insertError } = await supabase
        .from("quizzes")
        .insert({
          course_id: courseId,
          slug,
          kind: "module",
          module_id: moduleId,
          pass_mark_percent: 80,
        })
        .select("id")
        .single();
      if (insertError || !data) throw new Error(`Could not insert module quiz ${slug}: ${insertError?.message}`);
      quizId = data.id;
    }
    usedQuizIds.add(quizId);
    await replaceQuizQuestions(quizId, module.quizQuestions);
    quizCount += 1;
    questionCount += module.quizQuestions.length;
  }

  const staleQuizIds = (existingQuizzes ?? [])
    .filter((row) => !usedQuizIds.has(row.id))
    .map((row) => row.id);
  if (staleQuizIds.length) {
    const { error: deleteError } = await supabase.from("quizzes").delete().in("id", staleQuizIds);
    if (deleteError) throw new Error(`Could not prune stale module quizzes: ${deleteError.message}`);
  }

  return { quizCount, questionCount };
}

async function upsertFinalQuiz(
  courseId: string,
  finalQuestions: GeneratedQuestion[]
): Promise<{ questionCount: number }> {
  const { data: existing, error } = await supabase
    .from("quizzes")
    .select("id")
    .eq("course_id", courseId)
    .eq("slug", "final")
    .maybeSingle();
  if (error) throw new Error(`Could not read final quiz: ${error.message}`);

  let quizId: string;
  if (existing) {
    const { error: updateError } = await supabase
      .from("quizzes")
      .update({ pass_mark_percent: 80 })
      .eq("id", existing.id);
    if (updateError) throw new Error(`Could not update final quiz: ${updateError.message}`);
    quizId = existing.id;
  } else {
    const { data, error: insertError } = await supabase
      .from("quizzes")
      .insert({
        course_id: courseId,
        slug: "final",
        kind: "final",
        module_id: null,
        pass_mark_percent: 80,
      })
      .select("id")
      .single();
    if (insertError || !data) throw new Error(`Could not insert final quiz: ${insertError?.message}`);
    quizId = data.id;
  }

  await replaceQuizQuestions(quizId, finalQuestions);
  return { questionCount: finalQuestions.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const createClient = await loadCreateClient();
  supabase = createClient<Database>(SUPABASE_URL as string, SERVICE_ROLE_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Loading ${SUPABASE_URL} ...`);
  const generated = loadGeneratedCourse();

  console.log("\n== Super admin ==");
  const { userId, created } = await ensureSuperAdmin();
  console.log(
    `  ${SUPER_ADMIN_EMAIL} -> user_id ${userId} (${created ? "created" : "already existed"}), super_admin role granted`
  );

  console.log("\n== Course ==");
  const courseId = await upsertCourse(generated);
  console.log(`  course id: ${courseId}, slug: ${COURSE_SLUG}`);

  console.log("\n== Modules & lessons ==");
  const { moduleIdByPosition, lessonCount } = await upsertModulesAndLessons(courseId, generated.modules);
  console.log(`  modules: ${generated.modules.length}, lessons: ${lessonCount}`);

  console.log("\n== Module quizzes ==");
  const moduleQuizStats = await upsertModuleQuizzes(courseId, generated.modules, moduleIdByPosition);
  console.log(`  quizzes: ${moduleQuizStats.quizCount}, questions: ${moduleQuizStats.questionCount}`);

  console.log("\n== Final quiz ==");
  const finalQuizStats = await upsertFinalQuiz(courseId, generated.finalQuestions);
  console.log(`  questions: ${finalQuizStats.questionCount}`);

  console.log("\n== Publish ==");
  const { error: publishError } = await supabase
    .from("courses")
    .update({ status: "published" })
    .eq("id", courseId);
  if (publishError) throw new Error(`Could not publish course: ${publishError.message}`);
  console.log("  status: published");

  console.log("\n================ SUMMARY ================");
  console.log(`Course:        ${generated.course.title}`);
  console.log(`Slug:          ${COURSE_SLUG}`);
  console.log(`Learner URL:   /learn/${COURSE_SLUG}`);
  console.log(`Admin URL:     /admin/courses/${COURSE_SLUG}`);
  console.log(`Modules:       ${generated.modules.length}`);
  console.log(`Lessons:       ${lessonCount}`);
  console.log(`Module quizzes:${moduleQuizStats.quizCount} (${moduleQuizStats.questionCount} questions)`);
  console.log(`Final quiz:    ${finalQuizStats.questionCount} questions`);
  console.log(`Super admin:   ${SUPER_ADMIN_EMAIL} (${created ? "created" : "existing"}, super_admin granted)`);
  console.log("===========================================\n");
}

main().catch((error) => {
  console.error("\nIMPORT FAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
