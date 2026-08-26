import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import type { AdminOffer, AdminOverview, AdminPayment } from '@kadsamhsa/domain';
import { ApiError, notFound } from '@kadsamhsa/domain';
import { recordAudit } from '../../audit.js';
import { query, queryOne, transaction } from '../../db/pool.js';

/**
 * Offers, payment reconciliation and the platform overview (PRD A5, A8).
 *
 * Pricing lives on offers rather than courses (PRD §4.2): an offer packages one
 * or more courses at a price, so the same course can be sold standalone, in a
 * bundle, or as a seat pack without its content changing.
 */

const OFFER_STATUSES = ['draft', 'active', 'archived'] as const;

const offerCreateSchema = z.object({
  name: z.string().trim().min(2, 'Give the offer a name').max(150),
  description: z.string().trim().max(2000).default(''),
  /** Minor units (kobo). 0 is a legitimate free offer. */
  priceAmount: z.number().int('Price must be a whole number of kobo').min(0),
  currency: z.string().trim().toUpperCase().length(3).default('NGN'),
  status: z.enum(OFFER_STATUSES).default('draft'),
  /** Seat packs for organisations; null means a single-learner offer. */
  seatCount: z.number().int().positive('Seat count must be at least 1').nullable().optional(),
  // An offer with no courses grants nothing when it is paid for, so refuse to
  // create one rather than letting it reach checkout.
  courseIds: z.array(z.uuid()).min(1, 'Select at least one course'),
});

const offerUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Give the offer a name').max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  priceAmount: z.number().int('Price must be a whole number of kobo').min(0).optional(),
  currency: z.string().trim().toUpperCase().length(3).optional(),
  status: z.enum(OFFER_STATUSES).optional(),
  seatCount: z.number().int().positive('Seat count must be at least 1').nullable().optional(),
  courseIds: z.array(z.uuid()).min(1, 'Select at least one course').optional(),
});

interface OfferRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_amount: number;
  currency: string;
  status: (typeof OFFER_STATUSES)[number];
  seat_count: number | null;
  course_ids: string[];
}

const OFFER_SELECT = `
  SELECT o.id, o.slug, o.name, o.description, o.price_amount, o.currency, o.status,
         o.seat_count,
         COALESCE(
           array_agg(oc.course_id ORDER BY oc.course_id) FILTER (WHERE oc.course_id IS NOT NULL),
           '{}'::uuid[]
         ) AS course_ids
    FROM offers o
    LEFT JOIN offer_courses oc ON oc.offer_id = o.id
`;

function toOffer(row: OfferRow): AdminOffer {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceAmount: row.price_amount,
    currency: row.currency,
    status: row.status,
    seatCount: row.seat_count,
    courseIds: row.course_ids,
  };
}

async function loadOffer(offerId: string): Promise<AdminOffer> {
  const row = await queryOne<OfferRow>(`${OFFER_SELECT} WHERE o.id = $1 GROUP BY o.id`, [offerId]);
  if (!row) {
    throw notFound('Offer not found');
  }
  return toOffer(row);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Derives a free slug from `name`. Runs on the transaction client so the read
 * of existing slugs and the write that claims one cannot be interleaved by a
 * concurrent create.
 */
async function uniqueSlug(
  client: PoolClient,
  name: string,
  excludeOfferId: string | null,
): Promise<string> {
  // A name of only punctuation slugifies to an empty string, which would
  // violate the NOT NULL/UNIQUE slug constraint on the second such offer.
  const base = slugify(name) || 'offer';

  const existing = await client.query<{ slug: string }>(
    `SELECT slug FROM offers
      WHERE (slug = $1 OR slug LIKE $1 || '-%')
        AND ($2::uuid IS NULL OR id <> $2::uuid)`,
    [base, excludeOfferId],
  );
  const taken = new Set(existing.rows.map((row) => row.slug));

  if (!taken.has(base)) {
    return base;
  }
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}

/**
 * Replaces the offer_courses join rows. Duplicates in the request are collapsed
 * first — the join table's primary key would otherwise reject the insert with a
 * database error the caller cannot act on.
 */
async function replaceOfferCourses(
  client: PoolClient,
  offerId: string,
  courseIds: string[],
): Promise<string[]> {
  const unique = [...new Set(courseIds)];

  const found = await client.query<{ id: string }>(
    `SELECT id FROM courses WHERE id = ANY($1::uuid[])`,
    [unique],
  );
  if (found.rows.length !== unique.length) {
    throw new ApiError('validation_failed', 'One or more selected courses do not exist', {
      courseIds: 'One or more selected courses do not exist',
    });
  }

  await client.query(`DELETE FROM offer_courses WHERE offer_id = $1`, [offerId]);
  await client.query(
    `INSERT INTO offer_courses (offer_id, course_id)
     SELECT $1, unnest($2::uuid[])`,
    [offerId, unique],
  );
  return unique;
}

interface PaymentRow {
  order_id: string;
  reference: string;
  learner_name: string;
  learner_email: string;
  offer_name: string;
  amount: number;
  currency: string;
  order_status: AdminPayment['orderStatus'];
  payment_status: AdminPayment['paymentStatus'];
  channel: string | null;
  paid_at: Date | null;
  created_at: Date;
}

interface OverviewRow {
  learners: string;
  published_courses: string;
  draft_courses: string;
  enrolments: string;
  completions: string;
  certificates_issued: string;
  revenue_minor: string;
}

export async function adminCommerceRoutes(app: FastifyInstance) {
  app.get('/admin/overview', {
    preHandler: app.requirePermission('user:read'),
    handler: async (): Promise<AdminOverview> => {
      // One round trip: every figure is an independent scalar subquery, so
      // there is nothing to join and no partial view of the platform.
      const row = await queryOne<OverviewRow>(
        `SELECT
           (SELECT count(*) FROM user_roles WHERE role_key = 'learner') AS learners,
           (SELECT count(*) FROM courses WHERE status = 'published') AS published_courses,
           (SELECT count(*) FROM courses WHERE status = 'draft') AS draft_courses,
           (SELECT count(*) FROM enrolments) AS enrolments,
           (SELECT count(*) FROM enrolments WHERE status = 'completed') AS completions,
           (SELECT count(*) FROM certificates WHERE status = 'valid') AS certificates_issued,
           (SELECT COALESCE(sum(amount), 0) FROM orders WHERE status = 'paid') AS revenue_minor`,
      );

      // count() and sum() come back from PG as strings (bigint/numeric).
      return {
        learners: Number(row?.learners ?? 0),
        publishedCourses: Number(row?.published_courses ?? 0),
        draftCourses: Number(row?.draft_courses ?? 0),
        enrolments: Number(row?.enrolments ?? 0),
        completions: Number(row?.completions ?? 0),
        certificatesIssued: Number(row?.certificates_issued ?? 0),
        revenueMinor: Number(row?.revenue_minor ?? 0),
        currency: 'NGN',
      };
    },
  });

  app.get('/admin/offers', {
    preHandler: app.requirePermission('offer:manage'),
    handler: async (): Promise<AdminOffer[]> => {
      const rows = await query<OfferRow>(
        `${OFFER_SELECT} GROUP BY o.id ORDER BY o.created_at DESC`,
      );
      return rows.map(toOffer);
    },
  });

  app.post('/admin/offers', {
    preHandler: app.requirePermission('offer:manage'),
    handler: async (request, reply) => {
      const user = request.currentUser!;
      const input = offerCreateSchema.parse(request.body);

      const offerId = await transaction(async (client) => {
        const slug = await uniqueSlug(client, input.name, null);

        const inserted = await client.query<{ id: string }>(
          `INSERT INTO offers (slug, name, description, price_amount, currency, status, seat_count)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id`,
          [
            slug,
            input.name,
            input.description,
            input.priceAmount,
            input.currency,
            input.status,
            input.seatCount ?? null,
          ],
        );
        const id = inserted.rows[0]!.id;

        const courseIds = await replaceOfferCourses(client, id, input.courseIds);

        await recordAudit(
          {
            actorId: user.id,
            action: 'offer.created',
            subjectType: 'offer',
            subjectId: id,
            metadata: {
              slug,
              priceAmount: input.priceAmount,
              currency: input.currency,
              status: input.status,
              courseIds,
            },
            ipAddress: request.ip,
          },
          client,
        );
        return id;
      });

      return reply.status(201).send(await loadOffer(offerId));
    },
  });

  app.patch<{ Params: { offerId: string } }>('/admin/offers/:offerId', {
    preHandler: app.requirePermission('offer:manage'),
    handler: async (request): Promise<AdminOffer> => {
      const user = request.currentUser!;
      const input = offerUpdateSchema.parse(request.body);
      const { offerId } = request.params;

      await transaction(async (client) => {
        // FOR UPDATE holds the row for the whole transaction, so a concurrent
        // rename cannot claim the slug between the uniqueness check and the
        // write below.
        const current = await client.query<{ id: string; name: string }>(
          `SELECT id, name FROM offers WHERE id = $1 FOR UPDATE`,
          [offerId],
        );
        const existing = current.rows[0];
        if (!existing) {
          throw notFound('Offer not found');
        }

        const sets: string[] = [];
        const params: unknown[] = [offerId];
        const set = (column: string, value: unknown) => {
          params.push(value);
          sets.push(`${column} = $${params.length}`);
        };

        if (input.name !== undefined) {
          set('name', input.name);
          // The slug tracks the name: orders reference offers by id, so
          // regenerating it never orphans a purchase.
          if (input.name !== existing.name) {
            set('slug', await uniqueSlug(client, input.name, offerId));
          }
        }
        if (input.description !== undefined) {
          set('description', input.description);
        }
        if (input.priceAmount !== undefined) {
          set('price_amount', input.priceAmount);
        }
        if (input.currency !== undefined) {
          set('currency', input.currency);
        }
        if (input.status !== undefined) {
          set('status', input.status);
        }
        if (input.seatCount !== undefined) {
          set('seat_count', input.seatCount);
        }

        await client.query(
          `UPDATE offers SET ${[...sets, 'updated_at = now()'].join(', ')} WHERE id = $1`,
          params,
        );

        const courseIds =
          input.courseIds === undefined
            ? undefined
            : await replaceOfferCourses(client, offerId, input.courseIds);

        await recordAudit(
          {
            actorId: user.id,
            action: 'offer.updated',
            subjectType: 'offer',
            subjectId: offerId,
            metadata: { changed: Object.keys(input), ...(courseIds ? { courseIds } : {}) },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadOffer(offerId);
    },
  });

  app.get('/admin/payments', {
    preHandler: app.requirePermission('payment:read:all'),
    handler: async (): Promise<AdminPayment[]> => {
      // An order may have no payment row yet (checkout started, never settled)
      // or several (a failed attempt followed by a successful retry). The
      // lateral join keeps this one row per order and picks the settled attempt
      // when there is one, which is the row reconciliation cares about.
      const rows = await query<PaymentRow>(
        `SELECT o.id AS order_id, o.reference, u.full_name AS learner_name,
                u.email AS learner_email, f.name AS offer_name, o.amount, o.currency,
                o.status AS order_status, p.status AS payment_status, p.channel,
                p.paid_at, o.created_at
           FROM orders o
           JOIN users u ON u.id = o.user_id
           JOIN offers f ON f.id = o.offer_id
           LEFT JOIN LATERAL (
             SELECT pm.status, pm.channel, pm.paid_at
               FROM payments pm
              WHERE pm.order_id = o.id
              ORDER BY (pm.status = 'succeeded') DESC, pm.created_at DESC
              LIMIT 1
           ) p ON TRUE
          ORDER BY o.created_at DESC
          LIMIT 200`,
      );

      return rows.map((row) => ({
        orderId: row.order_id,
        reference: row.reference,
        learnerName: row.learner_name,
        learnerEmail: row.learner_email,
        offerName: row.offer_name,
        amount: row.amount,
        currency: row.currency,
        orderStatus: row.order_status,
        paymentStatus: row.payment_status,
        channel: row.channel,
        paidAt: row.paid_at?.toISOString() ?? null,
        createdAt: row.created_at.toISOString(),
      }));
    },
  });
}
