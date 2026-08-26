import type { FastifyInstance } from 'fastify';
import { ApiError, loginSchema, registerSchema } from '@kadsamhsa/domain';
import { recordAudit } from '../audit.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import {
  REFRESH_COOKIE,
  clearRefreshCookie,
  loadPublicUser,
  revokeSessionByToken,
  rotateSession,
  startSession,
} from '../auth/sessions.js';
import { queryOne, transaction } from '../db/pool.js';

const PRIVACY_POLICY_VERSION = '2026-08-01';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', {
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    handler: async (request, reply) => {
      const input = registerSchema.parse(request.body);

      const existing = await queryOne<{ id: string }>(
        `SELECT id FROM users WHERE lower(email) = lower($1)`,
        [input.email],
      );
      if (existing) {
        // Registration is public, so this does disclose that an address is
        // taken. The alternative — silently succeeding — leaves the learner
        // unable to explain why they never receive the welcome email.
        throw new ApiError('conflict', 'An account with this email already exists', {
          email: 'An account with this email already exists',
        });
      }

      const passwordHash = await hashPassword(input.password);

      const userId = await transaction(async (client) => {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO users (email, full_name) VALUES ($1, $2) RETURNING id`,
          [input.email, input.fullName],
        );
        const id = inserted.rows[0]!.id;

        await client.query(
          `INSERT INTO password_credentials (user_id, password_hash) VALUES ($1, $2)`,
          [id, passwordHash],
        );
        await client.query(`INSERT INTO user_roles (user_id, role_key) VALUES ($1, 'learner')`, [
          id,
        ]);
        await client.query(
          `INSERT INTO consents (user_id, policy_key, policy_version, ip_address)
           VALUES ($1, 'privacy_policy', $2, $3)`,
          [id, PRIVACY_POLICY_VERSION, request.ip],
        );
        await recordAudit(
          {
            actorId: id,
            action: 'user.registered',
            subjectType: 'user',
            subjectId: id,
            ipAddress: request.ip,
          },
          client,
        );
        return id;
      });

      const user = await loadPublicUser(userId);
      const session = await startSession(request, reply, userId);
      return reply.status(201).send({ user, ...session });
    },
  });

  app.post('/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
    handler: async (request, reply) => {
      const input = loginSchema.parse(request.body);

      const row = await queryOne<{ id: string; status: string; password_hash: string | null }>(
        `SELECT u.id, u.status, pc.password_hash
           FROM users u
           LEFT JOIN password_credentials pc ON pc.user_id = u.id
          WHERE lower(u.email) = lower($1)`,
        [input.email],
      );

      // One message for every failure mode — unknown address, wrong password,
      // suspended account, or a migrated account with no credential yet.
      const invalid = new ApiError('unauthenticated', 'Email or password is incorrect');

      if (!row || row.status !== 'active' || !row.password_hash) {
        // Still spend the time an argon2 verify would, so response timing does
        // not reveal whether the address exists.
        await hashPassword(input.password);
        throw invalid;
      }

      if (!(await verifyPassword(input.password, row.password_hash))) {
        await recordAudit({
          actorId: row.id,
          action: 'user.login_failed',
          subjectType: 'user',
          subjectId: row.id,
          ipAddress: request.ip,
        });
        throw invalid;
      }

      const user = await loadPublicUser(row.id);
      if (!user) {
        throw invalid;
      }

      const session = await startSession(request, reply, row.id);
      await recordAudit({
        actorId: row.id,
        action: 'user.logged_in',
        subjectType: 'user',
        subjectId: row.id,
        ipAddress: request.ip,
      });

      return reply.send({ user, ...session });
    },
  });

  app.post('/auth/refresh', async (request, reply) => {
    const presented = request.cookies[REFRESH_COOKIE];
    if (!presented) {
      throw new ApiError('unauthenticated', 'No session');
    }

    const rotated = await rotateSession(request, reply, presented);
    if (!rotated) {
      clearRefreshCookie(reply);
      throw new ApiError('unauthenticated', 'Session expired');
    }

    const user = await loadPublicUser(rotated.userId);
    if (!user) {
      clearRefreshCookie(reply);
      throw new ApiError('unauthenticated', 'Session expired');
    }

    return reply.send({
      user,
      accessToken: rotated.accessToken,
      expiresIn: rotated.expiresIn,
    });
  });

  /**
   * Sign out. This route never fails the caller.
   *
   * The cookie is cleared first: if revocation then throws (DB outage), a 500
   * would leave the HttpOnly refresh cookie alive, and the SPA — which cannot
   * read or delete that cookie — would silently restore the session on the next
   * page load. Clearing first means the worst case is an orphaned `sessions`
   * row that expires on its own, not a user who cannot sign out.
   */
  app.post('/auth/logout', async (request, reply) => {
    clearRefreshCookie(reply);

    const presented = request.cookies[REFRESH_COOKIE];
    if (presented) {
      try {
        // Resolve the actor from the session itself. The access token has a
        // 15-minute TTL, so an idle tab signing out has no `currentUser`, and
        // keying the audit off that would silently skip most real sign-outs.
        const revoked = await revokeSessionByToken(presented);
        if (revoked) {
          await recordAudit({
            actorId: revoked.userId,
            action: 'user.logged_out',
            subjectType: 'session',
            subjectId: revoked.sessionId,
            ipAddress: request.ip,
          });
        }
      } catch (error) {
        request.log.error({ err: error }, 'logout revocation failed; cookie already cleared');
      }
    }

    return reply.status(204).send();
  });

  app.get('/me', async (request) => {
    return app.requireUser(request);
  });
}
