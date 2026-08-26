import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AdminCertificate, CertificateTemplate } from '@kadsamhsa/domain';
import { ApiError, notFound } from '@kadsamhsa/domain';
import { recordAudit } from '../../audit.js';
import { query, queryOne, transaction } from '../../db/pool.js';

/**
 * Certificate register and the per-course certificate template (PRD A4, §7.3).
 *
 * A certificate row is never deleted, only flipped between `valid` and
 * `revoked`. The public verification endpoint answers by verification id, and
 * "revoked" is a materially different answer to an employer than "not found":
 * one says the award was withdrawn, the other says it never existed. Deleting
 * the row would silently turn every revocation into the second answer.
 *
 * Revocation is therefore reversible by record — `reinstate` clears the
 * revocation fields — and every transition is audited.
 */

const uuidSchema = z.uuid();

/**
 * A malformed id can never match a row, and handing it to Postgres turns what
 * should be a 404 into a 500 ("invalid input syntax for type uuid").
 */
function requireUuid(value: string, message: string): string {
  if (!uuidSchema.safeParse(value).success) {
    throw notFound(message);
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* Request validation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * A revocation is quoted back in the audit trail and is the only record of why
 * an award was withdrawn, so "no" or an empty string is not an answer anyone
 * can act on months later.
 */
const revokeSchema = z.object({
  reason: z.string().trim().min(3, 'Give a reason for revoking this certificate').max(500),
});

/**
 * Template asset URLs end up in `src` on the rendered certificate, so an
 * unconstrained string here would be a stored XSS vector. Only http(s) and
 * site-relative paths (uploads served by this platform) are accepted.
 */
const assetUrlSchema = z
  .string()
  .trim()
  .min(1, 'Enter a URL')
  .max(2048)
  .refine((value) => {
    if (value.startsWith('/') && !value.startsWith('//')) {
      return true;
    }
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Enter an http(s) URL');

const templateSchema = z.object({
  name: z.string().trim().min(1, 'Give the template a name').max(150).optional(),
  title: z.string().trim().min(1, 'Enter a certificate title').max(200),
  // The body is printed on one page. Past a couple of thousand characters it
  // stops fitting the certificate rather than degrading gracefully.
  body: z.string().trim().min(1, 'Enter the certificate wording').max(2000),
  backgroundUrl: assetUrlSchema.nullish(),
  logoUrl: assetUrlSchema.nullish(),
  signatoryOne: z.string().trim().max(120).default(''),
  signatoryOneTitle: z.string().trim().max(120).default(''),
  signatoryTwo: z.string().trim().max(120).default(''),
  signatoryTwoTitle: z.string().trim().max(120).default(''),
});

/* -------------------------------------------------------------------------- */
/* Row shapes and mapping                                                      */
/* -------------------------------------------------------------------------- */

interface CertificateRow {
  id: string;
  verification_id: string;
  learner_name: string;
  learner_email: string;
  course_title: string;
  course_id: string;
  score_percent: number | null;
  status: 'valid' | 'revoked';
  issued_at: Date;
  revoked_at: Date | null;
  revoked_reason: string | null;
}

/**
 * `learner_name` and `course_title` are read off the certificate, not off the
 * joined `users`/`courses` rows. They were snapshotted at issue time and are
 * what is printed on the document and returned by public verification, so the
 * register has to show the same thing — a learner who later changes their name
 * must still be findable by the name an employer is holding. The joins supply
 * the learner's current email (never snapshotted, and the way staff make
 * contact) and the course the register links through to.
 */
const CERTIFICATE_SELECT = `
  SELECT cert.id, cert.verification_id, cert.learner_name, u.email AS learner_email,
         cert.course_title, c.id AS course_id, cert.score_percent, cert.status,
         cert.issued_at, cert.revoked_at, cert.revoked_reason
    FROM certificates cert
    JOIN users u ON u.id = cert.user_id
    JOIN courses c ON c.id = cert.course_id
`;

function toCertificate(row: CertificateRow): AdminCertificate {
  return {
    id: row.id,
    verificationId: row.verification_id,
    learnerName: row.learner_name,
    learnerEmail: row.learner_email,
    courseTitle: row.course_title,
    courseId: row.course_id,
    scorePercent: row.score_percent,
    status: row.status,
    issuedAt: row.issued_at.toISOString(),
    revokedAt: row.revoked_at?.toISOString() ?? null,
    revokedReason: row.revoked_reason,
  };
}

/** The one read path for every endpoint that answers with an AdminCertificate. */
async function loadCertificate(certificateId: string): Promise<AdminCertificate> {
  const row = await queryOne<CertificateRow>(`${CERTIFICATE_SELECT} WHERE cert.id = $1`, [
    certificateId,
  ]);
  if (!row) {
    throw notFound('Certificate not found');
  }
  return toCertificate(row);
}

interface TemplateRow {
  id: string;
  course_id: string | null;
  name: string;
  title: string;
  body: string;
  background_url: string | null;
  logo_url: string | null;
  signatory_one: string;
  signatory_one_title: string;
  signatory_two: string;
  signatory_two_title: string;
}

const TEMPLATE_SELECT = `
  SELECT t.id, t.course_id, t.name, t.title, t.body, t.background_url, t.logo_url,
         t.signatory_one, t.signatory_one_title, t.signatory_two, t.signatory_two_title
    FROM certificate_templates t
`;

function toTemplate(row: TemplateRow): CertificateTemplate {
  return {
    id: row.id,
    courseId: row.course_id,
    name: row.name,
    title: row.title,
    body: row.body,
    backgroundUrl: row.background_url,
    logoUrl: row.logo_url,
    signatoryOne: row.signatory_one,
    signatoryOneTitle: row.signatory_one_title,
    signatoryTwo: row.signatory_two,
    signatoryTwoTitle: row.signatory_two_title,
  };
}

// Mirrors the column defaults in migration 007, so the first save of an
// untouched editor stores exactly what the editor was showing.
const DEFAULT_TITLE = 'Certificate of Completion';
const DEFAULT_BODY =
  'This certifies that {{learner_name}} has successfully completed {{course_title}}.';

/**
 * Most courses never get a bespoke template. Returning a default-valued one
 * with an empty id — rather than a 404 — means the editor always has something
 * to render, and the empty id is what tells the client this is unsaved.
 */
function defaultTemplate(courseId: string, courseTitle: string): CertificateTemplate {
  return {
    id: '',
    courseId,
    name: `${courseTitle} certificate`.slice(0, 150),
    title: DEFAULT_TITLE,
    body: DEFAULT_BODY,
    backgroundUrl: null,
    logoUrl: null,
    signatoryOne: '',
    signatoryOneTitle: '',
    signatoryTwo: '',
    signatoryTwoTitle: '',
  };
}

async function loadCourse(courseId: string): Promise<{ id: string; title: string }> {
  const course = await queryOne<{ id: string; title: string }>(
    `SELECT id, title FROM courses WHERE id = $1`,
    [requireUuid(courseId, 'Course not found')],
  );
  if (!course) {
    throw notFound('Course not found');
  }
  return course;
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

export async function adminCertificateRoutes(app: FastifyInstance) {
  app.get('/admin/certificates', {
    preHandler: app.requirePermission('user:read'),
    handler: async (): Promise<AdminCertificate[]> => {
      // Newest first and capped: the register is a working list staff scan and
      // act on, not an export. Reports (PRD A8) are where the whole history
      // lives.
      const rows = await query<CertificateRow>(
        `${CERTIFICATE_SELECT} ORDER BY cert.issued_at DESC LIMIT 200`,
      );
      return rows.map(toCertificate);
    },
  });

  app.post<{ Params: { id: string } }>('/admin/certificates/:id/revoke', {
    preHandler: app.requirePermission('certificate:revoke'),
    handler: async (request): Promise<AdminCertificate> => {
      const user = request.currentUser!;
      const certificateId = requireUuid(request.params.id, 'Certificate not found');
      const { reason } = revokeSchema.parse(request.body);

      await transaction(async (client) => {
        // FOR UPDATE holds the row for the whole transaction: two admins
        // revoking at once would otherwise both pass the status check and the
        // second reason would overwrite the first, leaving an audit trail that
        // disagrees with the row.
        const current = await client.query<{
          id: string;
          status: 'valid' | 'revoked';
          verification_id: string;
        }>(`SELECT id, status, verification_id FROM certificates WHERE id = $1 FOR UPDATE`, [
          certificateId,
        ]);

        const certificate = current.rows[0];
        if (!certificate) {
          throw notFound('Certificate not found');
        }
        if (certificate.status === 'revoked') {
          throw new ApiError('conflict', 'This certificate has already been revoked');
        }

        await client.query(
          `UPDATE certificates
              SET status = 'revoked',
                  revoked_at = now(),
                  revoked_by = $2,
                  revoked_reason = $3
            WHERE id = $1`,
          [certificateId, user.id, reason],
        );

        await recordAudit(
          {
            actorId: user.id,
            action: 'certificate.revoked',
            subjectType: 'certificate',
            subjectId: certificateId,
            // The verification id is what a third party quotes when they ask
            // why a certificate stopped verifying, so it has to be searchable
            // in the audit log without joining back to a row that may since
            // have been reinstated.
            metadata: { reason, verificationId: certificate.verification_id },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadCertificate(certificateId);
    },
  });

  app.post<{ Params: { id: string } }>('/admin/certificates/:id/reinstate', {
    preHandler: app.requirePermission('certificate:revoke'),
    handler: async (request): Promise<AdminCertificate> => {
      const user = request.currentUser!;
      const certificateId = requireUuid(request.params.id, 'Certificate not found');

      await transaction(async (client) => {
        const current = await client.query<{
          id: string;
          status: 'valid' | 'revoked';
          verification_id: string;
          revoked_reason: string | null;
        }>(
          `SELECT id, status, verification_id, revoked_reason
             FROM certificates
            WHERE id = $1
            FOR UPDATE`,
          [certificateId],
        );

        const certificate = current.rows[0];
        if (!certificate) {
          throw notFound('Certificate not found');
        }
        if (certificate.status === 'valid') {
          throw new ApiError('conflict', 'This certificate is not revoked');
        }

        await client.query(
          `UPDATE certificates
              SET status = 'valid',
                  revoked_at = NULL,
                  revoked_by = NULL,
                  revoked_reason = NULL
            WHERE id = $1`,
          [certificateId],
        );

        await recordAudit(
          {
            actorId: user.id,
            action: 'certificate.reinstated',
            subjectType: 'certificate',
            subjectId: certificateId,
            // Clearing the columns is what makes the certificate verify again;
            // carrying the reason into the audit event is what keeps the fact
            // that it was once revoked, and why, from being erased with them.
            metadata: {
              verificationId: certificate.verification_id,
              clearedReason: certificate.revoked_reason,
            },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadCertificate(certificateId);
    },
  });

  /* ---------------------------------------------------------------------- */
  /* Per-course template editor                                              */
  /* ---------------------------------------------------------------------- */

  app.get<{ Params: { courseId: string } }>('/admin/courses/:courseId/certificate-template', {
    preHandler: app.requirePermission('certificate_template:manage'),
    handler: async (request): Promise<CertificateTemplate> => {
      const course = await loadCourse(request.params.courseId);

      const row = await queryOne<TemplateRow>(`${TEMPLATE_SELECT} WHERE t.course_id = $1`, [
        course.id,
      ]);

      return row ? toTemplate(row) : defaultTemplate(course.id, course.title);
    },
  });

  app.put<{ Params: { courseId: string } }>('/admin/courses/:courseId/certificate-template', {
    preHandler: app.requirePermission('certificate_template:manage'),
    handler: async (request): Promise<CertificateTemplate> => {
      const user = request.currentUser!;
      const course = await loadCourse(request.params.courseId);
      const input = templateSchema.parse(request.body);

      const saved = await transaction(async (client) => {
        // Upsert against `certificate_templates_course_key`, the partial unique
        // index on course_id. The editor has no separate create and edit path,
        // so a save must land whether or not a row exists yet — and two saves
        // racing must produce one row, not a unique violation.
        const result = await client.query<TemplateRow>(
          `INSERT INTO certificate_templates
             (course_id, name, title, body, background_url, logo_url,
              signatory_one, signatory_one_title, signatory_two, signatory_two_title)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (course_id) WHERE course_id IS NOT NULL
           DO UPDATE SET name = EXCLUDED.name,
                         title = EXCLUDED.title,
                         body = EXCLUDED.body,
                         background_url = EXCLUDED.background_url,
                         logo_url = EXCLUDED.logo_url,
                         signatory_one = EXCLUDED.signatory_one,
                         signatory_one_title = EXCLUDED.signatory_one_title,
                         signatory_two = EXCLUDED.signatory_two,
                         signatory_two_title = EXCLUDED.signatory_two_title,
                         updated_at = now()
           RETURNING id, course_id, name, title, body, background_url, logo_url,
                     signatory_one, signatory_one_title, signatory_two, signatory_two_title`,
          [
            course.id,
            // `name` is NOT NULL and is the label in any future template
            // picker; the course title is the only sensible thing to fall back
            // to when the editor does not collect one.
            input.name ?? `${course.title} certificate`.slice(0, 150),
            input.title,
            input.body,
            input.backgroundUrl ?? null,
            input.logoUrl ?? null,
            input.signatoryOne,
            input.signatoryOneTitle,
            input.signatoryTwo,
            input.signatoryTwoTitle,
          ],
        );

        const row = result.rows[0]!;

        await recordAudit(
          {
            actorId: user.id,
            action: 'certificate_template.updated',
            subjectType: 'certificate_template',
            subjectId: row.id,
            metadata: { courseId: course.id, title: row.title },
            ipAddress: request.ip,
          },
          client,
        );

        return row;
      });

      return toTemplate(saved);
    },
  });
}
