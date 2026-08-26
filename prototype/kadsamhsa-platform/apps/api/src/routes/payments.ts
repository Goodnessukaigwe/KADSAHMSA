import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import { ApiError, notFound } from '@kadsamhsa/domain';
import { recordAudit } from '../audit.js';
import { query, queryOne, transaction } from '../db/pool.js';

/**
 * Checkout and the Paystack webhook (PRD F9).
 *
 * Two invariants hold this file together:
 *
 *  1. Access is granted by the webhook, never by the browser. The client is
 *     told where to pay; it is never trusted to report that payment happened.
 *  2. Every gateway delivery is written to `payment_events` before it is acted
 *     on, keyed so that a replay is a no-op. Paystack retries aggressively, and
 *     a double delivery must never mean a double grant.
 */

const PAYSTACK_INITIALISE_URL = 'https://api.paystack.co/transaction/initialize';

/** Our own order reference: 'KAD-' plus 24 hex characters. */
function newReference(): string {
  return `KAD-${randomBytes(12).toString('hex')}`;
}

/** The raw request bytes, kept by the content-type parser registered below. */
type RawBodyRequest = FastifyRequest & { rawBody?: Buffer };

export interface CheckoutResult {
  reference: string;
  /**
   * Where to send the learner to pay. Null when the offer was free (access is
   * already granted) or when the gateway is not configured locally — `status`
   * tells the two apart.
   */
  authorizationUrl: string | null;
  status: 'pending' | 'paid';
}

/** A learner's own order, for the purchase history on their account page. */
export interface LearnerOrder {
  orderId: string;
  reference: string;
  offerName: string;
  /** Minor units (kobo). */
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  paymentStatus: 'pending' | 'succeeded' | 'failed' | 'refunded' | null;
  channel: string | null;
  paidAt: string | null;
  createdAt: string;
}

const checkoutSchema = z.object({
  offerId: z.uuid('Choose a valid offer'),
});

/**
 * Only the fields we act on. Unknown keys are dropped here but the delivery is
 * stored whole in `payment_events`, so nothing is lost for reconciliation.
 *
 * `data` is defaulted rather than required: Paystack sends event types we do
 * not handle, and one of those arriving without the shape we expect should be
 * recorded and dismissed, not left looking like a delivery a human must chase.
 */
const paystackEventSchema = z.object({
  event: z.string().min(1).max(120),
  data: z
    .object({
      id: z.union([z.number().int(), z.string()]).optional(),
      reference: z.string().min(1).max(200).optional(),
      amount: z.number().int().optional(),
      currency: z.string().max(10).optional(),
      channel: z.string().max(60).nullish(),
      paid_at: z.string().max(60).nullish(),
    })
    .default({}),
});

type PaystackEvent = z.infer<typeof paystackEventSchema>;

interface OfferRow {
  id: string;
  name: string;
  price_amount: number;
  currency: string;
  status: 'draft' | 'active' | 'archived';
  course_count: string;
}

interface OrderRow {
  id: string;
  user_id: string;
  offer_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
}

interface LearnerOrderRow {
  order_id: string;
  reference: string;
  offer_name: string;
  amount: number;
  currency: string;
  order_status: LearnerOrder['status'];
  payment_status: LearnerOrder['paymentStatus'];
  channel: string | null;
  paid_at: Date | null;
  created_at: Date;
}

function toLearnerOrder(row: LearnerOrderRow): LearnerOrder {
  return {
    orderId: row.order_id,
    reference: row.reference,
    offerName: row.offer_name,
    amount: row.amount,
    currency: row.currency,
    status: row.order_status,
    paymentStatus: row.payment_status,
    channel: row.channel,
    paidAt: row.paid_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

/**
 * Verifies Paystack's `x-paystack-signature`: HMAC SHA512 of the raw body under
 * the secret key. The comparison is constant-time, and the length is checked
 * first because `timingSafeEqual` throws on mismatched buffers.
 */
function isSignatureValid(raw: Buffer, signature: string, secret: string): boolean {
  const expected = createHmac('sha512', secret).update(raw).digest();
  const presented = Buffer.from(signature.trim(), 'hex');
  if (presented.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(presented, expected);
}

function bodyDigest(raw: Buffer): string {
  return createHash('sha256').update(raw).digest('hex').slice(0, 40);
}

/**
 * The idempotency key for a delivery.
 *
 * Unverified deliveries get their own namespace on purpose. If they shared the
 * verified key space, anyone could POST an unsigned `charge.success` carrying a
 * transaction id, and the genuine signed delivery that followed would be
 * swallowed by the `ON CONFLICT DO NOTHING` below — a payment that never grants
 * access.
 *
 * Keying unverified deliveries by their body digest means repeated forgeries of
 * the same body collapse to one row, which is deliberate: an attacker must not
 * be able to grow this table at will. Each attempt is still logged.
 */
function deriveEventId(raw: Buffer, event: PaystackEvent | null, signatureValid: boolean): string {
  if (!signatureValid) {
    return `unverified:${bodyDigest(raw)}`;
  }
  const identity = event?.data.id ?? event?.data.reference ?? bodyDigest(raw);
  // Scoped by event type: one transaction legitimately produces several events
  // (success, then a later refund) that share an id.
  return `${event?.event ?? 'unknown'}:${identity}`;
}

/**
 * Marks the order paid and grants an active enrolment for every course in its
 * offer. Idempotent, so a redelivery that slips past the event-level dedupe
 * still cannot double-grant. Must run inside a transaction.
 */
async function fulfilOrder(
  client: PoolClient,
  order: { id: string; userId: string; offerId: string },
): Promise<string[]> {
  // A refunded order stays refunded: a late delivery must not resurrect access
  // that has already been withdrawn.
  await client.query(
    `UPDATE orders SET status = 'paid', updated_at = now()
      WHERE id = $1 AND status <> 'refunded'`,
    [order.id],
  );

  const granted = await client.query<{ course_id: string }>(
    `INSERT INTO enrolments (user_id, course_id, source)
     SELECT $1, oc.course_id, 'self'
       FROM offer_courses oc
      WHERE oc.offer_id = $2
     ON CONFLICT (user_id, course_id) DO UPDATE
       SET status = CASE
                      WHEN enrolments.status = 'cancelled' THEN 'active'
                      ELSE enrolments.status
                    END
     RETURNING course_id`,
    [order.userId, order.offerId],
  );

  return granted.rows.map((row) => row.course_id);
}

interface PaystackInitialiseResponse {
  status?: boolean;
  message?: string;
  data?: { authorization_url?: string; access_code?: string; reference?: string };
}

async function initialiseTransaction(params: {
  secretKey: string;
  reference: string;
  amount: number;
  currency: string;
  email: string;
}): Promise<string> {
  const response = await fetch(PAYSTACK_INITIALISE_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${params.secretKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      reference: params.reference,
      // Paystack also expects minor units, so the stored kobo amount goes over
      // the wire unchanged.
      amount: params.amount,
      currency: params.currency,
      email: params.email,
    }),
    // A hung gateway must not hold the learner's request open indefinitely.
    signal: AbortSignal.timeout(15_000),
  });

  const payload = (await response.json().catch(() => null)) as PaystackInitialiseResponse | null;
  const authorizationUrl = payload?.data?.authorization_url;

  if (!response.ok || payload?.status !== true || !authorizationUrl) {
    throw new Error(
      `Paystack initialise failed (HTTP ${response.status}): ${payload?.message ?? 'unreadable response'}`,
    );
  }

  return authorizationUrl;
}

export async function paymentRoutes(app: FastifyInstance) {
  /**
   * The webhook signature covers the bytes Paystack sent, so those bytes must
   * survive to the handler. Re-serialising the parsed body is not equivalent —
   * key order and whitespace are not preserved, and every delivery would fail
   * verification.
   *
   * This is registered inside the plugin, so it replaces the JSON parser for
   * these three routes only. A body that will not parse yields `{}` rather than
   * a framing error: the webhook must answer 200 to everything, and an
   * unreadable body is recorded as an unverified delivery rather than sent back
   * as a 400 that Paystack would retry forever.
   */
  app.addContentTypeParser<Buffer>(
    'application/json',
    { parseAs: 'buffer' },
    (request, body, done) => {
      (request as RawBodyRequest).rawBody = body;
      if (body.length === 0) {
        done(null, {});
        return;
      }
      try {
        done(null, JSON.parse(body.toString('utf8')));
      } catch {
        done(null, {});
      }
    },
  );

  app.post('/checkout', {
    preHandler: app.requirePermission('course:enrol'),
    handler: async (request): Promise<CheckoutResult> => {
      const user = request.currentUser!;
      const input = checkoutSchema.parse(request.body);

      const offer = await queryOne<OfferRow>(
        `SELECT o.id, o.name, o.price_amount, o.currency, o.status,
                (SELECT count(*) FROM offer_courses oc WHERE oc.offer_id = o.id) AS course_count
           FROM offers o
          WHERE o.id = $1`,
        [input.offerId],
      );

      // A draft or archived offer is not on sale. Reported as missing rather
      // than forbidden, so probing ids cannot map out unreleased pricing.
      if (!offer || offer.status !== 'active') {
        throw notFound('Offer not found');
      }

      if (Number(offer.course_count) === 0) {
        throw new ApiError('conflict', 'This offer has no courses attached yet');
      }

      const reference = newReference();
      const isFree = offer.price_amount === 0;

      const orderId = await transaction(async (client) => {
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO orders (user_id, offer_id, amount, currency, status, reference)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id`,
          [
            user.id,
            offer.id,
            // The price is copied, not referenced: repricing the offer later
            // must not rewrite what this learner agreed to pay.
            offer.price_amount,
            offer.currency,
            isFree ? 'paid' : 'pending',
            reference,
          ],
        );
        const id = inserted.rows[0]!.id;

        if (isFree) {
          // No gateway is involved, so `provider` is not 'paystack' — the
          // reconciliation view would otherwise show settlements that Paystack
          // has never heard of.
          await client.query(
            `INSERT INTO payments (order_id, provider, provider_reference, amount, currency,
                                   status, channel, paid_at)
             VALUES ($1, 'none', $2, $3, $4, 'succeeded', 'free', now())`,
            [id, reference, offer.price_amount, offer.currency],
          );

          const courseIds = await fulfilOrder(client, {
            id,
            userId: user.id,
            offerId: offer.id,
          });

          await recordAudit(
            {
              actorId: user.id,
              action: 'payment.succeeded',
              subjectType: 'order',
              subjectId: id,
              metadata: {
                reference,
                offerId: offer.id,
                amount: 0,
                currency: offer.currency,
                provider: 'none',
                coursesGranted: courseIds,
              },
              ipAddress: request.ip,
            },
            client,
          );
        } else {
          await client.query(
            `INSERT INTO payments (order_id, provider, amount, currency, status)
             VALUES ($1, 'paystack', $2, $3, 'pending')`,
            [id, offer.price_amount, offer.currency],
          );

          await recordAudit(
            {
              actorId: user.id,
              action: 'order.created',
              subjectType: 'order',
              subjectId: id,
              metadata: {
                reference,
                offerId: offer.id,
                amount: offer.price_amount,
                currency: offer.currency,
              },
              ipAddress: request.ip,
            },
            client,
          );
        }

        return id;
      });

      if (isFree) {
        return { reference, authorizationUrl: null, status: 'paid' };
      }

      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        // Local development has no gateway credentials. The order is real and
        // pending; a developer can settle it by posting a signed webhook.
        request.log.warn(
          { reference, orderId },
          'PAYSTACK_SECRET_KEY is not set — checkout returns no authorization URL',
        );
        return { reference, authorizationUrl: null, status: 'pending' };
      }

      try {
        const authorizationUrl = await initialiseTransaction({
          secretKey,
          reference,
          amount: offer.price_amount,
          currency: offer.currency,
          email: user.email,
        });
        return { reference, authorizationUrl, status: 'pending' };
      } catch (error) {
        request.log.error({ err: error, reference, orderId }, 'paystack initialise failed');

        // Fail the order rather than leaving it pending forever. If the gateway
        // did create the transaction despite the error, the webhook still finds
        // the order by reference and settles it.
        await query(
          `UPDATE orders SET status = 'failed', updated_at = now()
            WHERE id = $1 AND status = 'pending'`,
          [orderId],
        );
        await query(
          `UPDATE payments SET status = 'failed' WHERE order_id = $1 AND status = 'pending'`,
          [orderId],
        );

        throw new ApiError('internal_error', 'Could not start payment. Try again shortly.');
      }
    },
  });

  /**
   * Paystack callback. Public by necessity — the signature is the only
   * authentication — and answers 200 to everything, including its own internal
   * failures, so the gateway stops retrying a delivery we cannot process.
   * `payment_events.processed_at` stays null on those, and that is what a human
   * reconciles against.
   *
   * The rate limit is raised above the global default for the same reason: a
   * 429 is a non-2xx, and settlement traffic arrives in bursts.
   */
  app.post('/webhooks/paystack', {
    config: { rateLimit: { max: 600, timeWindow: '1 minute' } },
    handler: async (request, reply) => {
      try {
        await handleDelivery(request);
      } catch (error) {
        request.log.error({ err: error }, 'paystack webhook failed before it could be processed');
      }
      return reply.status(200).send({ received: true });
    },
  });

  app.get('/me/payments', {
    preHandler: app.requirePermission('payment:read:own'),
    handler: async (request): Promise<LearnerOrder[]> => {
      // LATERAL rather than a plain LEFT JOIN: an order can accumulate more
      // than one payment row (a retry, then a refund), and joining them all
      // would duplicate the order in the learner's history.
      const rows = await query<LearnerOrderRow>(
        `SELECT o.id AS order_id, o.reference, o.amount, o.currency,
                o.status AS order_status, o.created_at,
                f.name AS offer_name,
                p.status AS payment_status, p.channel, p.paid_at
           FROM orders o
           JOIN offers f ON f.id = o.offer_id
           LEFT JOIN LATERAL (
             SELECT status, channel, paid_at
               FROM payments
              WHERE order_id = o.id
              ORDER BY created_at DESC
              LIMIT 1
           ) p ON TRUE
          WHERE o.user_id = $1
          ORDER BY o.created_at DESC`,
        [request.currentUser!.id],
      );

      return rows.map(toLearnerOrder);
    },
  });
}

/**
 * Verifies, records and — where warranted — acts on one delivery. Throwing from
 * here is safe: the route above logs it and still answers 200.
 */
async function handleDelivery(request: FastifyRequest): Promise<void> {
  const raw = (request as RawBodyRequest).rawBody ?? Buffer.alloc(0);
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const header = request.headers['x-paystack-signature'];
  const signature = typeof header === 'string' ? header : null;

  const signatureValid =
    secretKey !== undefined && signature !== null && isSignatureValid(raw, signature, secretKey);

  const parsed = paystackEventSchema.safeParse(request.body);
  const event = parsed.success ? parsed.data : null;
  const eventType = event?.event ?? 'unknown';
  const providerEventId = deriveEventId(raw, event, signatureValid);

  // Written before anything is acted on, so even a delivery we reject leaves a
  // trace. A conflict means Paystack has sent this one before.
  const stored = await queryOne<{ id: string }>(
    `INSERT INTO payment_events (provider, provider_event_id, event_type, payload, signature_valid)
     VALUES ('paystack', $1, $2, $3::jsonb, $4)
     ON CONFLICT (provider, provider_event_id) DO NOTHING
     RETURNING id`,
    [providerEventId, eventType, JSON.stringify(request.body ?? {}), signatureValid],
  );

  if (!stored) {
    // A repeat forgery dedupes on its body digest, so it would otherwise be
    // indistinguishable from a routine gateway retry in the logs. Kept at warn
    // so a burst of them is still visible to monitoring.
    if (signatureValid) {
      request.log.info({ providerEventId }, 'paystack webhook replay ignored');
    } else {
      request.log.warn({ providerEventId }, 'repeat unverified paystack delivery ignored');
    }
    return;
  }

  if (!signatureValid) {
    // Nothing downstream of this point runs. An unverified event is a claim,
    // not a fact, and it never touches payment state.
    request.log.warn(
      { providerEventId, hasSecret: secretKey !== undefined, hasSignature: signature !== null },
      'paystack webhook signature invalid — event recorded, not processed',
    );
    return;
  }

  if (!event) {
    request.log.warn({ providerEventId }, 'paystack webhook body did not match the expected shape');
    return;
  }

  if (event.event !== 'charge.success') {
    request.log.info({ providerEventId, eventType }, 'paystack webhook event not handled');
    await query(`UPDATE payment_events SET processed_at = now() WHERE id = $1`, [stored.id]);
    return;
  }

  await settleChargeSuccess(request, event, stored.id);
}

/**
 * Settles a verified `charge.success`: payment succeeded, order paid,
 * enrolments granted, audit written — all in one transaction, so a failure
 * anywhere leaves the learner unpaid rather than half-enrolled.
 */
async function settleChargeSuccess(
  request: FastifyRequest,
  event: PaystackEvent,
  eventId: string,
): Promise<void> {
  const reference = event.data.reference;
  if (!reference) {
    request.log.error({ eventId }, 'charge.success carried no reference');
    return;
  }

  const providerReference = String(event.data.id ?? reference);
  const channel = event.data.channel ?? null;
  const paidAt = event.data.paid_at && event.data.paid_at.length > 0 ? event.data.paid_at : null;

  await transaction(async (client) => {
    // FOR UPDATE serialises concurrent deliveries for the same order, so two
    // near-simultaneous retries cannot both pass the checks below.
    const found = await client.query<OrderRow>(
      `SELECT id, user_id, offer_id, amount, currency, status
         FROM orders
        WHERE reference = $1
        FOR UPDATE`,
      [reference],
    );
    const order = found.rows[0];

    if (!order) {
      request.log.error({ eventId, reference }, 'charge.success for an unknown reference');
      return;
    }

    // The gateway reports what was actually collected. If it disagrees with
    // what we billed — in either direction, or in a different currency — this
    // is not the payment we are owed, so nothing is granted and a human looks
    // at it.
    const amountMatches =
      event.data.amount === order.amount &&
      (event.data.currency === undefined || event.data.currency === order.currency);

    if (!amountMatches) {
      request.log.error(
        {
          eventId,
          reference,
          expectedAmount: order.amount,
          expectedCurrency: order.currency,
          reportedAmount: event.data.amount,
          reportedCurrency: event.data.currency,
        },
        'charge.success amount does not match the order — refusing to grant access',
      );
      await recordAudit(
        {
          actorId: null,
          action: 'payment.amount_mismatch',
          subjectType: 'order',
          subjectId: order.id,
          metadata: {
            reference,
            expectedAmount: order.amount,
            expectedCurrency: order.currency,
            reportedAmount: event.data.amount ?? null,
            reportedCurrency: event.data.currency ?? null,
          },
          ipAddress: request.ip,
        },
        client,
      );
      await client.query(`UPDATE payment_events SET processed_at = now() WHERE id = $1`, [eventId]);
      return;
    }

    const settled = await client.query(
      `UPDATE payments
          SET status = 'succeeded',
              provider_reference = $2,
              channel = $3,
              paid_at = coalesce($4::timestamptz, now())
        WHERE order_id = $1 AND status IN ('pending', 'failed')
        RETURNING id`,
      [order.id, providerReference, channel, paidAt],
    );

    if (settled.rowCount === 0) {
      // Checkout always leaves a pending row, so reaching here means either a
      // redelivery (already succeeded) or an order created outside checkout.
      // The unique constraint on (provider, provider_reference) settles which.
      await client.query(
        `INSERT INTO payments (order_id, provider, provider_reference, amount, currency,
                               status, channel, paid_at)
         VALUES ($1, 'paystack', $2, $3, $4, 'succeeded', $5, coalesce($6::timestamptz, now()))
         ON CONFLICT (provider, provider_reference) DO NOTHING`,
        [order.id, providerReference, order.amount, order.currency, channel, paidAt],
      );
    }

    const courseIds = await fulfilOrder(client, {
      id: order.id,
      userId: order.user_id,
      offerId: order.offer_id,
    });

    await recordAudit(
      {
        actorId: order.user_id,
        action: 'payment.succeeded',
        subjectType: 'order',
        subjectId: order.id,
        metadata: {
          reference,
          providerReference,
          provider: 'paystack',
          amount: order.amount,
          currency: order.currency,
          channel,
          coursesGranted: courseIds,
        },
        ipAddress: request.ip,
      },
      client,
    );

    await client.query(`UPDATE payment_events SET processed_at = now() WHERE id = $1`, [eventId]);
  });
}
