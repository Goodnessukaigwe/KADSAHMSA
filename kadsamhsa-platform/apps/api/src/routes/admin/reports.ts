import type { FastifyInstance } from 'fastify';
import { recordAudit } from '../../audit.js';
import { query } from '../../db/pool.js';

/**
 * CSV report exports (PRD A8; the four buttons on the wireframe's admin
 * dashboard: Enrolments, Completions, Quiz performance, Payments).
 *
 * These exist so KADSAMHSA can evidence training to funders without asking the
 * vendor for a database dump — the self-management principle in PRD §1.
 *
 * Every export is an audit event: these files carry learner names, emails and
 * scores, so who pulled which report needs to be answerable later.
 */

type CsvValue = string | number | boolean | Date | null | undefined;

/**
 * Serialises one CSV field.
 *
 * The leading-character guard is deliberate: Excel and Sheets execute a cell
 * beginning `=`, `+`, `-` or `@` as a formula, so a learner who registers with
 * the name `=HYPERLINK(...)` would otherwise get code running inside a KADSAMHSA
 * staff member's spreadsheet. Prefixing a single quote neutralises it while
 * leaving the text readable.
 */
function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  const raw = value instanceof Date ? value.toISOString() : String(value);
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))];
  // CRLF and a UTF-8 BOM so Excel on Windows opens Nigerian names correctly
  // rather than mangling the encoding.
  return `﻿${lines.join('\r\n')}\r\n`;
}

interface ReportDefinition {
  slug: string;
  filename: string;
  headers: string[];
  sql: string;
}

const REPORTS: ReportDefinition[] = [
  {
    slug: 'enrolments',
    filename: 'enrolments',
    headers: [
      'Learner',
      'Email',
      'Course',
      'Status',
      'Enrolled at',
      'Lessons completed',
      'Lessons total',
      'Progress %',
    ],
    sql: `
      SELECT u.full_name, u.email, c.title, e.status, e.enrolled_at,
             (SELECT count(*) FROM lesson_progress lp
               WHERE lp.enrolment_id = e.id AND lp.completed) AS lessons_done,
             (SELECT count(*) FROM lessons l
                JOIN modules m ON m.id = l.module_id
               WHERE m.course_id = c.id AND l.is_required) AS lessons_total
        FROM enrolments e
        JOIN users u ON u.id = e.user_id
        JOIN courses c ON c.id = e.course_id
       ORDER BY e.enrolled_at DESC
    `,
  },
  {
    slug: 'completions',
    filename: 'completions',
    headers: ['Learner', 'Email', 'Course', 'Completed at', 'Certificate ID', 'Certificate status'],
    sql: `
      SELECT u.full_name, u.email, c.title, e.completed_at,
             cert.verification_id, cert.status
        FROM enrolments e
        JOIN users u ON u.id = e.user_id
        JOIN courses c ON c.id = e.course_id
        LEFT JOIN certificates cert ON cert.enrolment_id = e.id
       WHERE e.status = 'completed'
       ORDER BY e.completed_at DESC NULLS LAST
    `,
  },
  {
    slug: 'quiz-performance',
    filename: 'quiz-performance',
    headers: [
      'Learner',
      'Email',
      'Course',
      'Quiz',
      'Kind',
      'Attempt',
      'Score %',
      'Passed',
      'Submitted at',
    ],
    sql: `
      SELECT u.full_name, u.email, c.title, q.title, q.kind,
             a.attempt_no, a.score_percent, a.passed, a.submitted_at
        FROM quiz_attempts a
        JOIN users u ON u.id = a.user_id
        JOIN quizzes q ON q.id = a.quiz_id
        JOIN courses c ON c.id = q.course_id
       WHERE a.submitted_at IS NOT NULL
       ORDER BY a.submitted_at DESC
    `,
  },
  {
    slug: 'payments',
    filename: 'payments',
    headers: [
      'Reference',
      'Learner',
      'Email',
      'Offer',
      'Amount (major units)',
      'Currency',
      'Order status',
      'Payment status',
      'Channel',
      'Paid at',
    ],
    sql: `
      SELECT o.reference, u.full_name, u.email, f.name,
             (o.amount::numeric / 100) AS amount_major,
             o.currency, o.status, p.status, p.channel, p.paid_at
        FROM orders o
        JOIN users u ON u.id = o.user_id
        JOIN offers f ON f.id = o.offer_id
        LEFT JOIN payments p ON p.order_id = o.id
       ORDER BY o.created_at DESC
    `,
  },
];

export async function adminReportRoutes(app: FastifyInstance) {
  for (const report of REPORTS) {
    app.get(`/admin/reports/${report.slug}.csv`, {
      preHandler: app.requirePermission('report:export'),
      handler: async (request, reply) => {
        const rows = await query<Record<string, CsvValue>>(report.sql);
        const body = toCsv(
          report.headers,
          rows.map((row) => Object.values(row)),
        );

        await recordAudit({
          actorId: request.currentUser!.id,
          action: 'report.exported',
          subjectType: 'report',
          subjectId: report.slug,
          metadata: { rowCount: rows.length },
          ipAddress: request.ip,
        });

        return reply
          .header('Content-Type', 'text/csv; charset=utf-8')
          .header(
            'Content-Disposition',
            `attachment; filename="kadsamhsa-${report.filename}.csv"`,
          )
          .send(body);
      },
    });
  }
}
