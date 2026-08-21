import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { config, isProduction } from './config.js';
import authPlugin from './plugins/auth.js';
import errorsPlugin from './plugins/errors.js';
import { adminCommerceRoutes } from './routes/admin/commerce.js';
import { adminCourseRoutes } from './routes/admin/courses.js';
import { adminQuizRoutes } from './routes/admin/quizzes.js';
import { adminReportRoutes } from './routes/admin/reports.js';
import { authRoutes } from './routes/auth.js';
import { courseRoutes } from './routes/courses.js';
import { enrolmentRoutes } from './routes/enrolments.js';
import { meRoutes } from './routes/me.js';
import { paymentRoutes } from './routes/payments.js';
import { quizRoutes } from './routes/quizzes.js';
import { verificationRoutes } from './routes/verification.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: isProduction ? 'info' : 'debug',
      // Never log credentials or session cookies, even at debug level.
      redact: ['req.headers.authorization', 'req.headers.cookie', 'body.password'],
    },
    trustProxy: isProduction,
  });

  await app.register(helmet, {
    // The API serves JSON only; the CSP that matters is the web app's.
    contentSecurityPolicy: false,
  });

  // Credentialed CORS cannot use a wildcard origin — the refresh cookie
  // depends on an exact match.
  //
  // `methods` must be listed explicitly: @fastify/cors defaults to
  // GET,HEAD,POST, which silently blocks every PATCH the SPA makes (lesson
  // progress, preferences) — the preflight still returns 204, so the failure
  // surfaces only as an opaque net::ERR_FAILED in the browser.
  await app.register(cors, {
    origin: [config.WEB_ORIGIN],
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
  });

  await app.register(errorsPlugin);
  await app.register(authPlugin);

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);
  await app.register(courseRoutes);
  await app.register(enrolmentRoutes);
  await app.register(meRoutes);
  await app.register(verificationRoutes);
  await app.register(quizRoutes);
  await app.register(paymentRoutes);

  // Staff back office. Every route inside these is permission-guarded
  // individually; the grouping is organisational, not a security boundary.
  await app.register(adminCourseRoutes);
  await app.register(adminQuizRoutes);
  await app.register(adminCommerceRoutes);
  await app.register(adminReportRoutes);

  return app;
}
