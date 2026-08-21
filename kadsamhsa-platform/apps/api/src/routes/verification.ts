import type { FastifyInstance } from 'fastify';
import type { CertificateVerification } from '@kadsamhsa/domain';
import { verificationIdSchema } from '@kadsamhsa/domain';
import { queryOne } from '../db/pool.js';

/**
 * Public certificate verification (PRD F7, §7.3).
 *
 * Returns validity, learner name, course title and issue date — nothing else,
 * for anyone, ever. A revoked certificate reports `revoked` and still shows
 * those four fields so an employer can tell "revoked" from "never existed".
 *
 * Rate-limited because this is an unauthenticated lookup by ID; without a limit
 * it is an enumeration oracle over learner names.
 */
export async function verificationRoutes(app: FastifyInstance) {
  app.get<{ Params: { verificationId: string } }>('/certificate-verifications/:verificationId', {
    config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    handler: async (request): Promise<CertificateVerification> => {
      const parsed = verificationIdSchema.safeParse(request.params.verificationId);

      if (!parsed.success) {
        return {
          verificationId: request.params.verificationId,
          status: 'not_found',
          learnerName: null,
          courseTitle: null,
          issuedAt: null,
        };
      }

      const row = await queryOne<{
        verification_id: string;
        learner_name: string;
        course_title: string;
        issued_at: Date;
        status: 'valid' | 'revoked';
      }>(
        `SELECT verification_id, learner_name, course_title, issued_at, status
           FROM certificates
          WHERE verification_id = $1`,
        [parsed.data],
      );

      if (!row) {
        return {
          verificationId: parsed.data,
          status: 'not_found',
          learnerName: null,
          courseTitle: null,
          issuedAt: null,
        };
      }

      return {
        verificationId: row.verification_id,
        status: row.status,
        learnerName: row.learner_name,
        courseTitle: row.course_title,
        issuedAt: row.issued_at.toISOString(),
      };
    },
  });
}
