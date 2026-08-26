import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Role } from '@kadsamhsa/domain';
import { permissionsForRoles } from '@kadsamhsa/domain';
import type { PublicUser } from '@kadsamhsa/domain';
import { config } from '../config.js';
import { query, queryOne } from '../db/pool.js';
import { generateRefreshToken, hashToken, signAccessToken } from './tokens.js';

export const REFRESH_COOKIE = 'kad_refresh';

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  email_verified: boolean;
  status: string;
}

export async function loadPublicUser(userId: string): Promise<PublicUser | null> {
  const user = await queryOne<UserRow>(
    `SELECT id, email, full_name, email_verified, status FROM users WHERE id = $1`,
    [userId],
  );
  if (!user || user.status !== 'active') {
    return null;
  }

  const roleRows = await query<{ role_key: string }>(
    `SELECT role_key FROM user_roles WHERE user_id = $1`,
    [userId],
  );
  const roles = roleRows.map((row) => row.role_key as Role);

  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    emailVerified: user.email_verified,
    roles,
    permissions: [...permissionsForRoles(roles)],
  };
}

function refreshExpiry(): Date {
  return new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: 'lax',
    path: '/auth',
    maxAge: config.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE, { path: '/auth' });
}

/** Issues a new session row plus the access token that references it. */
export async function startSession(
  request: FastifyRequest,
  reply: FastifyReply,
  userId: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const refresh = generateRefreshToken();

  const session = await queryOne<{ id: string }>(
    `INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      userId,
      refresh.hash,
      request.headers['user-agent'] ?? null,
      request.ip,
      refreshExpiry(),
    ],
  );
  if (!session) {
    throw new Error('Failed to create session');
  }

  setRefreshCookie(reply, refresh.token);
  const accessToken = await signAccessToken({ sub: userId, sid: session.id });
  return { accessToken, expiresIn: config.ACCESS_TOKEN_TTL_SECONDS };
}

interface SessionRow {
  id: string;
  user_id: string;
  revoked_at: Date | null;
  replaced_by: string | null;
  expires_at: Date;
}

/**
 * Rotates a refresh token: the presented session is revoked and replaced.
 *
 * A token that is already revoked is treated as a replay — every live session
 * for that user is revoked, because either the cookie leaked or two clients are
 * racing, and neither is safe to keep going.
 */
export async function rotateSession(
  request: FastifyRequest,
  reply: FastifyReply,
  presentedToken: string,
): Promise<{ userId: string; accessToken: string; expiresIn: number } | null> {
  const session = await queryOne<SessionRow>(
    `SELECT id, user_id, revoked_at, replaced_by, expires_at
       FROM sessions
      WHERE refresh_token_hash = $1`,
    [hashToken(presentedToken)],
  );

  if (!session) {
    return null;
  }

  if (session.revoked_at !== null) {
    // Only a token that was ROTATED away (replaced_by set) and then presented
    // again looks like theft. A token revoked by sign-out has no replacement —
    // that is just a request racing the logout, e.g. a dashboard fetch already
    // in flight on the same device. Nuking every session for that would sign
    // the user out of their other devices and raise a false theft alert.
    if (session.replaced_by !== null) {
      await query(
        `UPDATE sessions SET revoked_at = now()
          WHERE user_id = $1 AND revoked_at IS NULL`,
        [session.user_id],
      );
      request.log.warn({ userId: session.user_id }, 'refresh token replay — sessions revoked');
    }
    clearRefreshCookie(reply);
    return null;
  }

  if (session.expires_at.getTime() <= Date.now()) {
    return null;
  }

  const refresh = generateRefreshToken();
  const replacement = await queryOne<{ id: string }>(
    `INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      session.user_id,
      refresh.hash,
      request.headers['user-agent'] ?? null,
      request.ip,
      refreshExpiry(),
    ],
  );
  if (!replacement) {
    return null;
  }

  await query(`UPDATE sessions SET revoked_at = now(), replaced_by = $2 WHERE id = $1`, [
    session.id,
    replacement.id,
  ]);

  setRefreshCookie(reply, refresh.token);
  const accessToken = await signAccessToken({
    sub: session.user_id,
    sid: replacement.id,
  });
  return { userId: session.user_id, accessToken, expiresIn: config.ACCESS_TOKEN_TTL_SECONDS };
}

/**
 * Revokes the session behind a refresh token, returning who it belonged to so
 * the caller can audit the sign-out without needing a live access token.
 *
 * `replaced_by` is deliberately left NULL: that is what distinguishes a session
 * ended by logout from one superseded by rotation, and `rotateSession` relies
 * on the difference to avoid treating a signed-out token as a stolen one.
 */
export async function revokeSessionByToken(
  token: string,
): Promise<{ userId: string; sessionId: string } | null> {
  const row = await queryOne<{ id: string; user_id: string }>(
    `UPDATE sessions SET revoked_at = now()
      WHERE refresh_token_hash = $1 AND revoked_at IS NULL
      RETURNING id, user_id`,
    [hashToken(token)],
  );
  return row ? { userId: row.user_id, sessionId: row.id } : null;
}

export async function isSessionLive(sessionId: string): Promise<boolean> {
  const row = await queryOne<{ id: string }>(
    `SELECT id FROM sessions
      WHERE id = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [sessionId],
  );
  return row !== null;
}
