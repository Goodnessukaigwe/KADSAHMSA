import { NextResponse, type NextRequest } from "next/server";

import { listCourseFeedback, listModuleFeedback } from "@/lib/admin/course-feedback";
import { listPayments } from "@/lib/admin/payments";
import { listUserEmails } from "@/lib/auth/admin-users";
import { getAuthUser, getUserRoles, isStaff } from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Spreadsheet programs run cells that start with = + - @, so those are defused. */
function cell(value: unknown) {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(header: string[], rows: unknown[][]) {
  return `﻿${[header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}

const KINDS = ["learners", "quizzes", "certificates", "payments", "course_feedback", "module_feedback"] as const;

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || !isStaff(await getUserRoles(user.id))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const kind = request.nextUrl.searchParams.get("kind");
  if (!KINDS.includes(kind as (typeof KINDS)[number])) {
    return NextResponse.json({ error: "unknown export" }, { status: 400 });
  }

  if (kind === "module_feedback") {
    const { rows } = await listModuleFeedback();
    const body = csv(
      ["submitted_at", "learner", "email", "course", "module", "rating", "comment", "page"],
      rows.map((row) => [
        row.createdAt, row.learnerName, row.learnerEmail, row.course, row.moduleIndex,
        row.rating, row.comment, row.pagePath,
      ])
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kadsamhsa-module-feedback-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "course_feedback") {
    const { rows } = await listCourseFeedback();
    const body = csv(
      [
        "submitted_at", "learner", "email", "course", "overall", "ease_of_use", "content_quality",
        "mobile_experience", "recommend_0_10", "worked_well", "improve", "had_problem", "problem",
      ],
      rows.map((row) => [
        row.createdAt, row.learnerName, row.learnerEmail, row.course, row.overall, row.easeOfUse,
        row.contentQuality, row.mobileExperience, row.recommend, row.enjoyed, row.improve,
        row.hadProblems ? "yes" : "no", row.problems,
      ])
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kadsamhsa-learner-survey-${new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (kind === "payments") {
    const month = request.nextUrl.searchParams.get("month");
    const { rows } = await listPayments(month);
    const csvBody = csv(
      [
        "reference",
        "source",
        "status",
        "paid_at",
        "created_at",
        "learner",
        "email",
        "course",
        "amount_ngn",
        "paystack_fee_ngn",
        "net_ngn",
        "channel",
        "paystack_transaction_id",
      ],
      rows.map((row) => [
        row.reference,
        "KADSAMHSA LMS",
        row.status,
        row.paidAt ?? "",
        row.createdAt,
        row.learnerName,
        row.learnerEmail,
        row.course,
        (row.amountKobo / 100).toFixed(2),
        row.feesKobo === null ? "" : (row.feesKobo / 100).toFixed(2),
        row.status === "success" ? ((row.amountKobo - (row.feesKobo ?? 0)) / 100).toFixed(2) : "",
        row.channel ?? "",
        row.transactionId ?? "",
      ])
    );
    return new NextResponse(csvBody, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="kadsamhsa-payments-${month || new Date().toISOString().slice(0, 10)}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const admin = createAdminClient();
  const [{ data: profiles }, { data: courses }, emails] = await Promise.all([
    admin.from("profiles").select("id, full_name, created_at"),
    admin.from("courses").select("id, title"),
    listUserEmails(admin),
  ]);
  const nameOf = new Map((profiles ?? []).map((row) => [row.id, row.full_name.trim()]));
  const courseOf = new Map((courses ?? []).map((row) => [row.id, row.title]));
  const stamp = new Date().toISOString().slice(0, 10);

  let body = "";
  if (kind === "learners") {
    const { data: enrolments } = await admin.from("enrolments").select("user_id, course_id, created_at, status");
    const { data: progress } = await admin.from("course_progress").select("user_id, course_id, completed_indexes");
    const done = new Map((progress ?? []).map((row) => [`${row.user_id}:${row.course_id}`, (row.completed_indexes ?? []).length]));
    body = csv(
      ["name", "email", "course", "status", "modules_completed", "enrolled_on", "joined_on"],
      (enrolments ?? []).map((row) => [
        nameOf.get(row.user_id) ?? "",
        emails.get(row.user_id) ?? "",
        courseOf.get(row.course_id) ?? "",
        row.status,
        done.get(`${row.user_id}:${row.course_id}`) ?? 0,
        row.created_at.slice(0, 10),
        (profiles ?? []).find((p) => p.id === row.user_id)?.created_at.slice(0, 10) ?? "",
      ])
    );
  } else if (kind === "quizzes") {
    const { data: attempts } = await admin
      .from("quiz_attempts")
      .select("user_id, quiz_id, attempt_no, score_percent, passed, submitted_at")
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false });
    const { data: quizzes } = await admin.from("quizzes").select("id, course_id, slug, kind");
    const quizOf = new Map((quizzes ?? []).map((row) => [row.id, row]));
    body = csv(
      ["name", "email", "course", "quiz", "attempt", "score_percent", "passed", "submitted_at"],
      (attempts ?? []).map((row) => {
        const quiz = quizOf.get(row.quiz_id);
        return [
          nameOf.get(row.user_id) ?? "",
          emails.get(row.user_id) ?? "",
          courseOf.get(quiz?.course_id ?? "") ?? "",
          quiz?.kind === "final" ? "Final assessment" : (quiz?.slug ?? ""),
          row.attempt_no,
          row.score_percent,
          row.passed ? "yes" : "no",
          row.submitted_at,
        ];
      })
    );
  } else {
    const { data: certs } = await admin
      .from("certificates")
      .select("user_id, course_id, verification_id, score_percent, issued_at, status")
      .order("issued_at", { ascending: false });
    body = csv(
      ["name", "email", "course", "verification_id", "score_percent", "status", "issued_at"],
      (certs ?? []).map((row) => [
        nameOf.get(row.user_id) ?? "",
        emails.get(row.user_id) ?? "",
        courseOf.get(row.course_id) ?? "",
        row.verification_id,
        row.score_percent,
        row.status,
        row.issued_at,
      ])
    );
  }

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="kadsamhsa-${kind}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
