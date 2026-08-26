-- M4: offers, orders, payments (PRD A5, F9).
--
-- Pricing is decoupled from content via Offers, per the Gurucan model in PRD
-- §4.2: an offer packages one or more courses at a price, so a course can be
-- sold standalone, in a bundle, or as an organisation seat pack without its
-- content changing.

CREATE TABLE offers (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug         TEXT NOT NULL UNIQUE,
    name         TEXT NOT NULL,
    description  TEXT NOT NULL DEFAULT '',
    -- Minor units (kobo). 0 is a legitimate free offer.
    price_amount INTEGER NOT NULL CHECK (price_amount >= 0),
    currency     TEXT NOT NULL DEFAULT 'NGN',
    status       TEXT NOT NULL DEFAULT 'draft'
                 CHECK (status IN ('draft', 'active', 'archived')),
    -- Seat packs for organisations; NULL means a single-learner offer.
    seat_count   INTEGER CHECK (seat_count IS NULL OR seat_count > 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE offer_courses (
    offer_id  UUID NOT NULL REFERENCES offers (id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    PRIMARY KEY (offer_id, course_id)
);

CREATE TABLE orders (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    offer_id     UUID NOT NULL REFERENCES offers (id) ON DELETE RESTRICT,
    -- Price is copied at purchase time; changing an offer must never rewrite
    -- what someone already paid.
    amount       INTEGER NOT NULL CHECK (amount >= 0),
    currency     TEXT NOT NULL DEFAULT 'NGN',
    status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'refunded')),
    -- Our own reference, sent to the gateway and echoed back on the webhook.
    reference    TEXT NOT NULL UNIQUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_status_idx ON orders (status, created_at DESC);

CREATE TABLE payments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id           UUID NOT NULL REFERENCES orders (id) ON DELETE RESTRICT,
    provider           TEXT NOT NULL DEFAULT 'paystack',
    provider_reference TEXT,
    amount             INTEGER NOT NULL CHECK (amount >= 0),
    currency           TEXT NOT NULL DEFAULT 'NGN',
    status             TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
    channel            TEXT,
    paid_at            TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- One settled payment per provider reference — the webhook may be
    -- delivered more than once.
    UNIQUE (provider, provider_reference)
);

CREATE INDEX payments_order_idx ON payments (order_id);

-- Every webhook delivery, stored before it is acted on. `provider_event_id`
-- makes replays a no-op rather than a double credit.
CREATE TABLE payment_events (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider          TEXT NOT NULL DEFAULT 'paystack',
    provider_event_id TEXT,
    event_type        TEXT NOT NULL,
    payload           JSONB NOT NULL,
    signature_valid   BOOLEAN NOT NULL,
    processed_at      TIMESTAMPTZ,
    received_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_event_id)
);
