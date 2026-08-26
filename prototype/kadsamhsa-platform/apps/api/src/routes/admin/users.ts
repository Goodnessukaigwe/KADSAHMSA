import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AdminUserDetail, AdminUserSummary } from '@kadsamhsa/domain';
import { ApiError, ROLES, notFound } from '@kadsamhsa/domain';
import { recordAudit } from '../../audit.js';
import { query, queryOne, transaction } from '../../db/pool.js';

/**
 * Users & CRM (PRD A6, wireframe sidebar "Users & CRM").
 *
 * Reading is `user:read`, granting roles is `role:assign`, and suspending or
 * reinstating an account is `user:manage` — three separate permissions because
 * a content admin who legitimately needs the learner list has no business
 * handing out super admin.
 */

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A malformed id can never match a row, and handing it to Postgres turns what
 * should be a 404 into a 500 ("invalid input syntax for type uuid").
 */
function requireUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw notFound(`${label} not found`);
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* Request validation                                                          */
/* -------------------------------------------------------------------------- */

const listQuerySchema = z.object({
  // Capped rather than rejected: an over-long paste into the search box should
  // narrow the list, not fail the page. The outer max only stops an absurd
  // payload reaching the trim.
  search: z
    .string()
    .max(2000)
    .transform((value) => value.trim().slice(0, 120))
    .optional(),
});

const rolesSchema = z.object({
  // z.enum over the shared ROLES list: an unknown key would otherwise reach the
  // user_roles → roles foreign key and surface as a 500 rather than a 422.
  // At least one role is required — a user with none can sign in and do
  // absolutely nothing, which reads as a broken account rather than a decision.
  roles: z
    .array(z.enum(ROLES))
    .min(1, 'Give the user at least one role')
    .max(ROLES.length),
});

const statusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

/**
 * Escapes a user-supplied search term for ILIKE. Without this a search for
 * "100%" matches every user, and "_" matches any single character — surprising
 * for staff, and a cheap way to scan the whole table.
 */
function likePattern(term: string): string {
  return `%${term.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;
}

/* -------------------------------------------------------------------------- */
/* Row shapes and mapping                                                      */
/* -------------------------------------------------------------------------- */

interface UserSummaryRow {
  id: string;
  full_name: string;
  email: string;
  status: AdminUserSummary['status'];
  email_verified: boolean;
  created_at: Date;
  roles: string[];
  enrolment_count: string;
  completion_count: string;
  certificate_count: string;
}

interface UserEnrolmentRow {
  enrolment_id: string;
  course_id: string;
  course_title: string;
  status: string;
  enrolled_at: Date;
  completed_at: Date | null;
  lessons_total: string;
  lessons_completed: string;
}

interface UserCertificateRow {
  id: string;
  verification_id: string;
  course_title: string;
  status: 'valid' | 'revoked';
  issued_at: Date;
}

interface UserPaymentRow {
  reference: string;
  offer_name: string;
  amount: number;
  currency: string;
  status: string;
  created_at: Date;
}

/**
 * The single read shape behind both the list and the detail view. Every figure
 * is a correlated scalar subquery on the same pass: a CRM list of 100 learners
 * must not become 300 extra round trips.
 */
const USER_SUMMARY_SELECT = `
  SELECT u.id, u.full_name, u.email, u.status, u.email_verified, u.created_at,
         (SELECT COALESCE(array_agg(ur.role_key ORDER BY ur.role_key), '{}'::text[])
            FROM user_roles ur
           WHERE ur.user_id = u.id) AS roles,
         (SELECT count(*) FROM enrolments e
           WHERE e.user_id = u.id AND e.status <> 'cancelled') AS enrolment_count,
         (SELECT count(*) FROM enrolments e
           WHERE e.user_id = u.id AND e.status = 'completed') AS completion_count,
         -- Revoked certificates are excluded: the count is what the learner can
         -- currently evidence, not what was ever printed.
         (SELECT count(*) FROM certificates cert
           WHERE cert.user_id = u.id AND cert.status = 'valid') AS certificate_count
    FROM users u
`;

function toSummary(row: UserSummaryRow): AdminUserSummary {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    roles: row.roles,
    status: row.status,
    emailVerified: row.email_verified,
    // count() comes back from PG as a string (bigint).
    enrolmentCount: Number(row.enrolment_count),
    completionCount: Number(row.completion_count),
    certificateCount: Number(row.certificate_count),
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * The one read path for every endpoint that answers with an AdminUserDetail, so
 * a role change and a status change return exactly the same shape the list row
 * expands into.
 */
async function loadUserDetail(userId: string): Promise<AdminUserDetail> {
  const user = await queryOne<UserSummaryRow>(`${USER_SUMMARY_SELECT} WHERE u.id = $1`, [userId]);
  if (!user) {
    throw notFound('User not found');
  }

  const enrolmentRows = await query<UserEnrolmentRow>(
    `SELECT e.id AS enrolment_id, e.course_id, c.title AS course_title, e.status,
            e.enrolled_at, e.completed_at,
            (SELECT count(*) FROM lessons l
               JOIN modules m ON m.id = l.module_id
              WHERE m.course_id = e.course_id AND l.is_required) AS lessons_total,
            -- Required lessons only, so the count shares a denominator with
            -- lessons_total and the percentage can never exceed 100.
            (SELECT count(*) FROM lesson_progress lp
               JOIN lessons l ON l.id = lp.lesson_id
               JOIN modules m ON m.id = l.module_id
              WHERE lp.enrolment_id = e.id
                AND lp.completed
                AND l.is_required
                AND m.course_id = e.course_id) AS lessons_completed
       FROM enrolments e
       JOIN courses c ON c.id = e.course_id
      WHERE e.user_id = $1
      ORDER BY e.enrolled_at DESC`,
    [userId],
  );

  const certificateRows = await query<UserCertificateRow>(
    `SELECT cert.id, cert.verification_id, cert.course_title, cert.status, cert.issued_at
       FROM certificates cert
      WHERE cert.user_id = $1
      ORDER BY cert.issued_at DESC`,
    [userId],
  );

  // An order may have no payment row yet (checkout started, never settled) or
  // several (a failed attempt then a successful retry), so the payment is
  // picked with a lateral join rather than a plain LEFT JOIN that would
  // duplicate the order. The status is reported in the order vocabulary
  // throughout — the payment row is the fresher outcome (an order sits at
  // 'pending' until the webhook lands) but the admin UI should not have to read
  // two different sets of words for the same thing.
  const paymentRows = await query<UserPaymentRow>(
    `SELECT o.reference, f.name AS offer_name, o.amount, o.currency, o.created_at,
            CASE
              WHEN p.status = 'succeeded' THEN 'paid'
              WHEN p.status = 'refunded' THEN 'refunded'
              WHEN p.status = 'failed' AND o.status = 'pending' THEN 'failed'
              ELSE o.status
            END AS status
       FROM orders o
       JOIN offers f ON f.id = o.offer_id
       LEFT JOIN LATERAL (
         SELECT pm.status
           FROM payments pm
          WHERE pm.order_id = o.id
          ORDER BY (pm.status = 'succeeded') DESC, pm.created_at DESC
          LIMIT 1
       ) p ON TRUE
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC`,
    [userId],
  );

  return {
    ...toSummary(user),
    enrolments: enrolmentRows.map((row) => {
      const total = Number(row.lessons_total);
      const completed = Number(row.lessons_completed);
      return {
        enrolmentId: row.enrolment_id,
        courseId: row.course_id,
        courseTitle: row.course_title,
        status: row.status,
        progressPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
        enrolledAt: row.enrolled_at.toISOString(),
        completedAt: row.completed_at?.toISOString() ?? null,
      };
    }),
    certificates: certificateRows.map((row) => ({
      id: row.id,
      verificationId: row.verification_id,
      courseTitle: row.course_title,
      status: row.status,
      issuedAt: row.issued_at.toISOString(),
    })),
    payments: paymentRows.map((row) => ({
      reference: row.reference,
      offerName: row.offer_name,
      // Minor units (kobo), straight from an INTEGER column.
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      createdAt: row.created_at.toISOString(),
    })),
  };
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

export async function adminUserRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { search?: string } }>('/admin/users', {
    preHandler: app.requirePermission('user:read'),
    handler: async (request): Promise<AdminUserSummary[]> => {
      const { search } = listQuerySchema.parse(request.query);
      const pattern = search ? likePattern(search) : null;

      const rows = await query<UserSummaryRow>(
        `${USER_SUMMARY_SELECT}
          WHERE $1::text IS NULL
             OR u.full_name ILIKE $1 ESCAPE '\\'
             OR u.email ILIKE $1 ESCAPE '\\'
          ORDER BY u.created_at DESC
          LIMIT 100`,
        [pattern],
      );

      return rows.map(toSummary);
    },
  });

  app.get<{ Params: { userId: string } }>('/admin/users/:userId', {
    preHandler: app.requirePermission('user:read'),
    handler: async (request): Promise<AdminUserDetail> =>
      loadUserDetail(requireUuid(request.params.userId, 'User')),
  });

  /**
   * Replaces the user's roles wholesale.
   *
   * Two refusals guard the one mistake that cannot be undone from inside the
   * product: removing the last super admin leaves nobody able to grant the role
   * back, and recovering means direct database access.
   */
  app.put<{ Params: { userId: string } }>('/admin/users/:userId/roles', {
    preHandler: app.requirePermission('role:assign'),
    handler: async (request): Promise<AdminUserDetail> => {
      const actor = request.currentUser!;
      const userId = requireUuid(request.params.userId, 'User');
      const input = rolesSchema.parse(request.body);
      // Deduplicated: a repeated role would violate the (user_id, role_key)
      // primary key and fail the insert.
      const nextRoles = [...new Set(input.roles)].sort();

      const beforeRoles = await transaction(async (client) => {
        const target = await client.query<{ id: string }>(
          `SELECT id FROM users WHERE id = $1 FOR UPDATE`,
          [userId],
        );
        if (!target.rows[0]) {
          throw notFound('User not found');
        }

        const currentRows = await client.query<{ role_key: string }>(
          `SELECT role_key FROM user_roles WHERE user_id = $1 ORDER BY role_key`,
          [userId],
        );
        const before = currentRows.rows.map((row) => row.role_key);

        if (before.includes('super_admin') && !nextRoles.includes('super_admin')) {
          if (userId === actor.id) {
            throw new ApiError(
              'conflict',
              'You cannot remove your own super admin role. Ask another super admin to do it.',
              { roles: 'You cannot remove your own super admin role' },
            );
          }

          // FOR UPDATE OF ur locks every active super admin's role row for the
          // rest of this transaction. Two admins each stripping a different
          // super admin at the same instant would otherwise both see "one other
          // remains" and between them remove the last one; here the second
          // transaction blocks, re-reads after the first commits, and is
          // refused.
          const supers = await client.query<{ user_id: string }>(
            `SELECT ur.user_id
               FROM user_roles ur
               JOIN users u ON u.id = ur.user_id
              WHERE ur.role_key = 'super_admin' AND u.status = 'active'
              FOR UPDATE OF ur`,
          );
          const othersRemaining = supers.rows.some((row) => row.user_id !== userId);
          if (!othersRemaining) {
            throw new ApiError(
              'conflict',
              'This is the last active super admin. Grant super admin to someone else first.',
              { roles: 'The platform must keep at least one active super admin' },
            );
          }
        }

        // Delete then insert rather than diff: the whole set is replaced, and
        // re-stamping granted_by on an unchanged role is the honest record of
        // who last confirmed it.
        await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
        await client.query(
          `INSERT INTO user_roles (user_id, role_key, granted_by)
           SELECT $1, unnest($2::text[]), $3`,
          [userId, nextRoles, actor.id],
        );

        await recordAudit(
          {
            actorId: actor.id,
            action: 'user.roles_changed',
            subjectType: 'user',
            subjectId: userId,
            metadata: { before, after: nextRoles },
            ipAddress: request.ip,
          },
          client,
        );

        return before;
      });

      request.log.info({ userId, before: beforeRoles, after: nextRoles }, 'user roles changed');
      return loadUserDetail(userId);
    },
  });

  /**
   * Suspends or reinstates an account.
   *
   * Suspension has to revoke live sessions as well as flip the flag: the access
   * token already in the suspended user's browser stays signed and unexpired,
   * and its refresh cookie would keep minting new ones, so without this they
   * carry on working until the refresh token runs out.
   */
  app.patch<{ Params: { userId: string } }>('/admin/users/:userId/status', {
    preHandler: app.requirePermission('user:manage'),
    handler: async (request): Promise<AdminUserDetail> => {
      const actor = request.currentUser!;
      const userId = requireUuid(request.params.userId, 'User');
      const { status } = statusSchema.parse(request.body);

      // Suspending yourself revokes your own sessions mid-request; if you were
      // the only active super admin, nobody is left to undo it.
      if (status === 'suspended' && userId === actor.id) {
        throw new ApiError('conflict', 'You cannot suspend your own account', {
          status: 'You cannot suspend your own account',
        });
      }

      await transaction(async (client) => {
        const found = await client.query<{ id: string; status: string }>(
          `SELECT id, status FROM users WHERE id = $1 FOR UPDATE`,
          [userId],
        );
        const existing = found.rows[0];
        if (!existing) {
          throw notFound('User not found');
        }

        // 'deleted' is an erasure outcome (NDPA), not a third position on this
        // toggle. Bringing such an account back is a deliberate act with its own
        // record-keeping, not a side effect of clicking Reinstate.
        if (existing.status === 'deleted') {
          throw new ApiError(
            'conflict',
            'This account has been deleted and cannot be changed here',
            { status: 'This account has been deleted' },
          );
        }

        if (existing.status === status) {
          // Nothing changed, so nothing is audited: a log full of no-op
          // suspensions makes the real ones harder to find.
          return;
        }

        await client.query(`UPDATE users SET status = $2, updated_at = now() WHERE id = $1`, [
          userId,
          status,
        ]);

        let revokedSessions = 0;
        if (status === 'suspended') {
          const revoked = await client.query(
            `UPDATE sessions SET revoked_at = now()
              WHERE user_id = $1 AND revoked_at IS NULL`,
            [userId],
          );
          revokedSessions = revoked.rowCount ?? 0;
        }

        await recordAudit(
          {
            actorId: actor.id,
            action: status === 'suspended' ? 'user.suspended' : 'user.reinstated',
            subjectType: 'user',
            subjectId: userId,
            metadata: { from: existing.status, to: status, revokedSessions },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadUserDetail(userId);
    },
  });
}
