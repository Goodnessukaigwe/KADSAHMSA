import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type {
  CertificateSummary,
  ContinueCourse,
  CourseSummary,
  LearnerDashboard,
} from '@kadsamhsa/domain';
import { ApiError } from '@kadsamhsa/domain';
import { query, queryOne } from '../db/pool.js';
import { toEnrolment } from './enrolments.js';

/** Preference keys the client may write. Anything else is rejected. */
const PREFERENCE_KEYS = ['dash_onboarding_dismissed'] as const;

const preferenceSchema = z.object({
  key: z.enum(PREFERENCE_KEYS),
  value: z.boolean(),
});

interface ContinueRow {
  enrolment_id: string;
  course_id: string;
  course_slug: string;
  course_title: string;
  cover_image_url: string | null;
  price_type: 'free' | 'paid';
  price_amount: number | null;
  currency: string;
  duration_minutes: number | null;
  lessons_total: string;
  lessons_completed: string;
  module_total: string;
  module_current: string | null;
}

function formatPrice(row: ContinueRow): string {
  if (row.price_type === 'free' || row.price_amount === null) {
    return 'Free';
  }
  // Stored in minor units (kobo).
  const major = row.price_amount / 100;
  return `${row.currency === 'NGN' ? '₦' : `${row.currency} `}${major.toLocaleString('en-NG')}`;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) {
    return 'Self-paced';
  }
  if (minutes < 90) {
    return `${minutes} Min`;
  }
  const hours = Math.round(minutes / 60);
  return `${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
}

function toContinueCourse(row: ContinueRow): ContinueCourse {
  const total = Number(row.lessons_total);
  const completed = Number(row.lessons_completed);
  const moduleTotal = Number(row.module_total);
  return {
    enrolmentId: row.enrolment_id,
    courseId: row.course_id,
    courseSlug: row.course_slug,
    courseTitle: row.course_title,
    coverImageUrl: row.cover_image_url,
    progressPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
    // Null means every module is finished; show the last one rather than 0.
    moduleCurrent: row.module_current === null ? moduleTotal : Number(row.module_current),
    moduleTotal,
    priceLabel: formatPrice(row),
    durationLabel: formatDuration(row.duration_minutes),
  };
}

/**
 * Active enrolments with the progress and module position the dashboard cards
 * need. `module_current` is the 1-based position of the earliest module that
 * still has an incomplete required lesson — i.e. where the learner resumes.
 */
const CONTINUE_SELECT = `
  SELECT e.id AS enrolment_id, e.course_id, c.slug AS course_slug, c.title AS course_title,
         c.cover_image_url, c.price_type, c.price_amount, c.currency, c.duration_minutes,
         (SELECT count(*) FROM lessons l
            JOIN modules m ON m.id = l.module_id
           WHERE m.course_id = c.id AND l.is_required) AS lessons_total,
         (SELECT count(*) FROM lesson_progress lp
           WHERE lp.enrolment_id = e.id AND lp.completed) AS lessons_completed,
         (SELECT count(*) FROM modules m WHERE m.course_id = c.id) AS module_total,
         (SELECT min(m.position) + 1
            FROM modules m
            JOIN lessons l ON l.module_id = m.id
            LEFT JOIN lesson_progress lp
                   ON lp.lesson_id = l.id AND lp.enrolment_id = e.id
           WHERE m.course_id = c.id
             AND l.is_required
             AND lp.completed IS DISTINCT FROM TRUE) AS module_current
    FROM enrolments e
    JOIN courses c ON c.id = e.course_id
   WHERE e.user_id = $1 AND e.status = 'active'
   ORDER BY e.enrolled_at DESC
`;

/** Learner dashboard (PRD F8): continue learning, my courses, certificates. */
export async function meRoutes(app: FastifyInstance) {
  app.get('/me/dashboard', {
    preHandler: app.requireUser,
    handler: async (request): Promise<LearnerDashboard> => {
      const user = request.currentUser!;

      const enrolmentRows = await query<Parameters<typeof toEnrolment>[0]>(
        `SELECT e.id, e.course_id, c.slug AS course_slug, c.title AS course_title,
                c.cover_image_url, e.status, e.enrolled_at, e.completed_at,
                (SELECT count(*) FROM lessons l
                   JOIN modules m ON m.id = l.module_id
                  WHERE m.course_id = c.id AND l.is_required) AS lessons_total,
                (SELECT count(*) FROM lesson_progress lp
                  WHERE lp.enrolment_id = e.id AND lp.completed) AS lessons_completed
           FROM enrolments e
           JOIN courses c ON c.id = e.course_id
          WHERE e.user_id = $1 AND e.status <> 'cancelled'
          ORDER BY e.enrolled_at DESC`,
        [user.id],
      );
      const enrolments = enrolmentRows.map(toEnrolment);

      const continueRows = await query<ContinueRow>(CONTINUE_SELECT, [user.id]);
      const active = continueRows.map(toContinueCourse);

      // Courses the learner has no enrolment for at all, including cancelled
      // ones — re-enrolling is a normal path, so those stay discoverable.
      const exploreRows = await query<{
        id: string;
        slug: string;
        title: string;
        summary: string;
        cover_image_url: string | null;
        price_type: 'free' | 'paid';
        price_amount: number | null;
        currency: string;
        duration_minutes: number | null;
        category_name: string | null;
        lesson_count: string;
        is_featured: boolean;
      }>(
        `SELECT c.id, c.slug, c.title, c.summary, c.cover_image_url, c.price_type,
                c.price_amount, c.currency, c.duration_minutes, c.is_featured,
                cat.name AS category_name,
                (SELECT count(*) FROM lessons l
                   JOIN modules m ON m.id = l.module_id
                  WHERE m.course_id = c.id) AS lesson_count
           FROM courses c
           LEFT JOIN course_categories cat ON cat.id = c.category_id
          WHERE c.status = 'published'
            AND NOT EXISTS (
              SELECT 1 FROM enrolments e
               WHERE e.course_id = c.id AND e.user_id = $1 AND e.status <> 'cancelled'
            )
          ORDER BY c.is_featured DESC, c.published_at DESC NULLS LAST, c.title ASC
          LIMIT 12`,
        [user.id],
      );

      const exploreCourses: CourseSummary[] = exploreRows.map((row) => ({
        id: row.id,
        slug: row.slug,
        title: row.title,
        summary: row.summary,
        coverImageUrl: row.cover_image_url,
        priceType: row.price_type,
        priceAmount: row.price_amount,
        currency: row.currency,
        durationMinutes: row.duration_minutes,
        categoryName: row.category_name,
        lessonCount: Number(row.lesson_count),
      }));

      const certificateRows = await query<{
        id: string;
        verification_id: string;
        course_title: string;
        issued_at: Date;
        status: 'valid' | 'revoked';
        storage_key: string | null;
      }>(
        `SELECT id, verification_id, course_title, issued_at, status, storage_key
           FROM certificates
          WHERE user_id = $1
          ORDER BY issued_at DESC`,
        [user.id],
      );

      const certificates: CertificateSummary[] = certificateRows.map((row) => ({
        id: row.id,
        verificationId: row.verification_id,
        courseTitle: row.course_title,
        issuedAt: row.issued_at.toISOString(),
        status: row.status,
        downloadUrl: row.storage_key ? `/me/certificates/${row.id}/download` : null,
      }));

      const onboarding = await queryOne<{ value: boolean }>(
        `SELECT value::text::boolean AS value
           FROM user_preferences
          WHERE user_id = $1 AND key = 'dash_onboarding_dismissed'`,
        [user.id],
      );

      return {
        user,
        hasStarted: active.length > 0,
        continueCourse: active[0] ?? null,
        alsoStarted: active.slice(1),
        exploreCourses,
        // Editorially featured first; otherwise whatever leads the explore list.
        featuredCourse:
          exploreRows.findIndex((row) => row.is_featured) >= 0
            ? exploreCourses[exploreRows.findIndex((row) => row.is_featured)]!
            : exploreCourses[0] ?? null,
        enrolments,
        certificates,
        onboardingDismissed: onboarding?.value ?? false,
        stats: {
          coursesInProgress: enrolments.filter((e) => e.status === 'active').length,
          coursesCompleted: enrolments.filter((e) => e.status === 'completed').length,
          certificatesEarned: certificates.filter((c) => c.status === 'valid').length,
        },
      };
    },
  });

  /**
   * A single certificate belonging to the caller (wireframe screen 8).
   *
   * Scoped by `user_id` in the WHERE clause rather than checked afterwards, so
   * a guessed certificate id returns 404 rather than someone else's award.
   * The course's template travels with it, because the wording, signatories and
   * logos are configured per course (PRD A4) and the view renders them.
   */
  app.get<{ Params: { certificateId: string } }>('/me/certificates/:certificateId', {
    preHandler: app.requirePermission('certificate:read:own'),
    handler: async (request) => {
      const row = await queryOne<{
        id: string;
        verification_id: string;
        learner_name: string;
        course_title: string;
        course_id: string;
        score_percent: number | null;
        status: 'valid' | 'revoked';
        issued_at: Date;
        template_title: string | null;
        template_body: string | null;
        background_url: string | null;
        logo_url: string | null;
        signatory_one: string | null;
        signatory_one_title: string | null;
        signatory_two: string | null;
        signatory_two_title: string | null;
      }>(
        `SELECT c.id, c.verification_id, c.learner_name, c.course_title, c.course_id,
                c.score_percent, c.status, c.issued_at,
                t.title AS template_title, t.body AS template_body,
                t.background_url, t.logo_url,
                t.signatory_one, t.signatory_one_title,
                t.signatory_two, t.signatory_two_title
           FROM certificates c
           LEFT JOIN certificate_templates t ON t.course_id = c.course_id
          WHERE c.id = $1 AND c.user_id = $2`,
        [request.params.certificateId, request.currentUser!.id],
      );

      if (!row) {
        throw new ApiError('not_found', 'Certificate not found');
      }

      const issuedAt = row.issued_at.toISOString();
      const fill = (text: string) =>
        text
          .replace(/\{\{learner_name\}\}/g, row.learner_name)
          .replace(/\{\{course_title\}\}/g, row.course_title)
          .replace(/\{\{issue_date\}\}/g, row.issued_at.toLocaleDateString('en-NG'))
          .replace(/\{\{verification_id\}\}/g, row.verification_id);

      return {
        id: row.id,
        verificationId: row.verification_id,
        learnerName: row.learner_name,
        courseTitle: row.course_title,
        scorePercent: row.score_percent,
        status: row.status,
        issuedAt,
        title: row.template_title ?? 'Certificate of Completion',
        body: fill(
          row.template_body ??
            'This certifies that {{learner_name}} has successfully completed {{course_title}}.',
        ),
        backgroundUrl: row.background_url,
        logoUrl: row.logo_url,
        signatories: [
          { name: row.signatory_one ?? '', title: row.signatory_one_title ?? '' },
          { name: row.signatory_two ?? '', title: row.signatory_two_title ?? '' },
        ].filter((s) => s.name !== ''),
      };
    },
  });

  app.patch('/me/preferences', {
    preHandler: app.requireUser,
    handler: async (request, reply) => {
      const parsed = preferenceSchema.safeParse(request.body);
      if (!parsed.success) {
        throw new ApiError('validation_failed', 'Unknown preference');
      }

      await query(
        `INSERT INTO user_preferences (user_id, key, value)
         VALUES ($1, $2, $3::jsonb)
         ON CONFLICT (user_id, key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [request.currentUser!.id, parsed.data.key, JSON.stringify(parsed.data.value)],
      );

      return reply.status(204).send();
    },
  });
}
