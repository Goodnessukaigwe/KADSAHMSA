import type { FastifyInstance } from 'fastify';
import type { Enrolment } from '@kadsamhsa/domain';
import { ApiError, lessonProgressSchema, notFound } from '@kadsamhsa/domain';
import { recordAudit } from '../audit.js';
import { query, queryOne, transaction } from '../db/pool.js';

interface EnrolmentRow {
  id: string;
  course_id: string;
  course_slug: string;
  course_title: string;
  cover_image_url: string | null;
  status: 'active' | 'completed' | 'cancelled';
  enrolled_at: Date;
  completed_at: Date | null;
  lessons_total: string;
  lessons_completed: string;
}

const ENROLMENT_SELECT = `
  SELECT e.id, e.course_id, c.slug AS course_slug, c.title AS course_title,
         c.cover_image_url, e.status, e.enrolled_at, e.completed_at,
         (SELECT count(*) FROM lessons l
            JOIN modules m ON m.id = l.module_id
           WHERE m.course_id = c.id AND l.is_required) AS lessons_total,
         (SELECT count(*) FROM lesson_progress lp
           WHERE lp.enrolment_id = e.id AND lp.completed) AS lessons_completed
    FROM enrolments e
    JOIN courses c ON c.id = e.course_id
`;

export function toEnrolment(row: EnrolmentRow): Enrolment {
  const total = Number(row.lessons_total);
  const completed = Number(row.lessons_completed);
  return {
    id: row.id,
    courseId: row.course_id,
    courseSlug: row.course_slug,
    courseTitle: row.course_title,
    coverImageUrl: row.cover_image_url,
    status: row.status,
    enrolledAt: row.enrolled_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null,
    lessonsTotal: total,
    lessonsCompleted: completed,
    progressPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

async function loadEnrolment(enrolmentId: string): Promise<Enrolment> {
  const row = await queryOne<EnrolmentRow>(`${ENROLMENT_SELECT} WHERE e.id = $1`, [enrolmentId]);
  if (!row) {
    throw notFound('Enrolment not found');
  }
  return toEnrolment(row);
}

export async function enrolmentRoutes(app: FastifyInstance) {
  app.post<{ Params: { courseId: string } }>('/courses/:courseId/enrolments', {
    preHandler: app.requirePermission('course:enrol'),
    handler: async (request, reply) => {
      const user = request.currentUser!;
      const { courseId } = request.params;

      const course = await queryOne<{ id: string; price_type: string; status: string }>(
        `SELECT id, price_type, status FROM courses WHERE id = $1`,
        [courseId],
      );

      if (!course || course.status !== 'published') {
        throw notFound('Course not found');
      }

      // Paid enrolment goes through checkout, which records the payment before
      // granting access. Until M4 lands, refuse rather than quietly enrolling
      // someone in a course they have not paid for.
      if (course.price_type === 'paid') {
        throw new ApiError(
          'forbidden',
          'This course requires payment. Checkout is not yet available.',
        );
      }

      const enrolmentId = await transaction(async (client) => {
        const result = await client.query<{ id: string }>(
          `INSERT INTO enrolments (user_id, course_id, source)
           VALUES ($1, $2, 'self')
           ON CONFLICT (user_id, course_id)
           DO UPDATE SET status = CASE
                           WHEN enrolments.status = 'cancelled' THEN 'active'
                           ELSE enrolments.status
                         END
           RETURNING id`,
          [user.id, course.id],
        );
        const id = result.rows[0]!.id;
        await recordAudit(
          {
            actorId: user.id,
            action: 'enrolment.created',
            subjectType: 'enrolment',
            subjectId: id,
            metadata: { courseId: course.id },
            ipAddress: request.ip,
          },
          client,
        );
        return id;
      });

      return reply.status(201).send(await loadEnrolment(enrolmentId));
    },
  });

  app.get('/me/enrolments', {
    preHandler: app.requireUser,
    handler: async (request) => {
      const rows = await query<EnrolmentRow>(
        `${ENROLMENT_SELECT} WHERE e.user_id = $1 AND e.status <> 'cancelled'
          ORDER BY e.enrolled_at DESC`,
        [request.currentUser!.id],
      );
      return rows.map(toEnrolment);
    },
  });

  app.patch<{ Params: { lessonId: string } }>('/lessons/:lessonId/progress', {
    preHandler: app.requirePermission('progress:write:own'),
    handler: async (request) => {
      const user = request.currentUser!;
      const input = lessonProgressSchema.parse(request.body);

      // The lesson must belong to a course this user is actively enrolled in.
      // Joining through the enrolment is what makes this "own progress only".
      const context = await queryOne<{ enrolment_id: string; course_id: string }>(
        `SELECT e.id AS enrolment_id, e.course_id
           FROM lessons l
           JOIN modules m ON m.id = l.module_id
           JOIN enrolments e ON e.course_id = m.course_id
          WHERE l.id = $1 AND e.user_id = $2 AND e.status = 'active'`,
        [request.params.lessonId, user.id],
      );

      if (!context) {
        throw notFound('Lesson not found for an active enrolment');
      }

      await query(
        `INSERT INTO lesson_progress (enrolment_id, lesson_id, completed, position_seconds, completed_at)
         VALUES ($1, $2, $3, $4, CASE WHEN $3 THEN now() ELSE NULL END)
         ON CONFLICT (enrolment_id, lesson_id) DO UPDATE
           SET completed = EXCLUDED.completed,
               position_seconds = GREATEST(lesson_progress.position_seconds, EXCLUDED.position_seconds),
               completed_at = CASE
                                WHEN EXCLUDED.completed AND lesson_progress.completed_at IS NULL
                                  THEN now()
                                WHEN NOT EXCLUDED.completed THEN NULL
                                ELSE lesson_progress.completed_at
                              END,
               updated_at = now()`,
        [context.enrolment_id, request.params.lessonId, input.completed, input.positionSeconds ?? 0],
      );

      // Completing every required lesson finishes the course content — but only
      // finishes the ENROLMENT when the course has no final assessment.
      //
      // Where a final quiz exists, completion is owned by the quiz engine: it
      // marks the enrolment completed at the moment it issues the certificate
      // (PRD §7.3). Auto-completing here would flip the enrolment out of
      // 'active' the instant the last lesson was ticked, and every quiz endpoint
      // requires an active enrolment — so the learner would be locked out of the
      // very assessment that earns the certificate.
      await query(
        `UPDATE enrolments e
            SET status = 'completed', completed_at = now()
          WHERE e.id = $1
            AND e.status = 'active'
            AND NOT EXISTS (
              SELECT 1 FROM quizzes q
               WHERE q.course_id = e.course_id AND q.kind = 'final'
            )
            AND NOT EXISTS (
              SELECT 1
                FROM lessons l
                JOIN modules m ON m.id = l.module_id
                LEFT JOIN lesson_progress lp
                       ON lp.lesson_id = l.id AND lp.enrolment_id = e.id
               WHERE m.course_id = e.course_id
                 AND l.is_required
                 AND (lp.completed IS DISTINCT FROM TRUE)
            )`,
        [context.enrolment_id],
      );

      return loadEnrolment(context.enrolment_id);
    },
  });
}
