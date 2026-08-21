import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { ApiError } from '@kadsamhsa/domain';

/**
 * Single error shape for the whole API: `{ error: { code, message, fields? } }`.
 * Unexpected errors are logged in full and reported generically, so an internal
 * message or stack never reaches a client.
 */
async function errorsPlugin(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send(error.toBody());
    }

    if (error instanceof ZodError) {
      const fields: Record<string, string> = {};
      for (const issue of error.issues) {
        const key = issue.path.join('.') || '_';
        fields[key] ??= issue.message;
      }
      return reply.status(422).send({
        error: { code: 'validation_failed', message: 'Check the highlighted fields', fields },
      });
    }

    const statusCode = (error as { statusCode?: number }).statusCode;

    // Malformed request framing (empty body with a JSON content-type, bad JSON,
    // oversized payload). Fastify raises these before any handler runs; they
    // are client errors, so they must not be reported as 500s.
    if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
      return reply.status(statusCode).send({
        error: {
          code: statusCode === 429 ? 'rate_limited' : 'validation_failed',
          message:
            statusCode === 429
              ? 'Too many requests. Try again shortly.'
              : 'The request could not be read',
        },
      });
    }

    if (statusCode === 429) {
      return reply.status(429).send({
        error: { code: 'rate_limited', message: 'Too many requests. Try again shortly.' },
      });
    }

    request.log.error({ err: error }, 'unhandled error');
    return reply.status(500).send({
      error: { code: 'internal_error', message: 'Something went wrong' },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ error: { code: 'not_found', message: 'Not found' } });
  });
}

export default fp(errorsPlugin, { name: 'errors' });
