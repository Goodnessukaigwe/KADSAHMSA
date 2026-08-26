import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import type { Permission, PublicUser } from '@kadsamhsa/domain';
import { forbidden, unauthenticated } from '@kadsamhsa/domain';
import { isSessionLive, loadPublicUser } from '../auth/sessions.js';
import { verifyAccessToken } from '../auth/tokens.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Populated on every request that carries a valid access token. */
    currentUser: PublicUser | null;
  }
  interface FastifyInstance {
    /** Route guard: requires a signed-in user. */
    requireUser: (request: FastifyRequest) => Promise<PublicUser>;
    /** Route guard: requires a signed-in user holding `permission`. */
    requirePermission: (
      permission: Permission,
    ) => (request: FastifyRequest) => Promise<PublicUser>;
  }
}

/**
 * Attaches the caller's identity and exposes the two guards every protected
 * route uses. Authentication and authorisation are separate steps on purpose:
 * being signed in is never sufficient by itself.
 */
async function authPlugin(app: FastifyInstance) {
  app.decorateRequest('currentUser', null);

  app.addHook('onRequest', async (request) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return;
    }

    const claims = await verifyAccessToken(header.slice('Bearer '.length));
    if (!claims) {
      return;
    }

    // The token is signed and unexpired, but the session behind it may have
    // been revoked (logout, replay detection, admin suspension) since it was
    // issued.
    if (!(await isSessionLive(claims.sid))) {
      return;
    }

    request.currentUser = await loadPublicUser(claims.sub);
  });

  app.decorate('requireUser', async (request: FastifyRequest) => {
    if (!request.currentUser) {
      throw unauthenticated();
    }
    return request.currentUser;
  });

  app.decorate(
    'requirePermission',
    (permission: Permission) => async (request: FastifyRequest) => {
      const user = request.currentUser;
      if (!user) {
        throw unauthenticated();
      }
      if (!user.permissions.includes(permission)) {
        request.log.warn(
          { userId: user.id, permission },
          'permission denied',
        );
        throw forbidden();
      }
      return user;
    },
  );
}

export default fp(authPlugin, { name: 'auth' });
