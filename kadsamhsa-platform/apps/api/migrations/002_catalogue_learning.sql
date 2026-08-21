-- M2: catalogue, learning state. M3/M5 skeletons for certificates and orgs.

CREATE TABLE course_categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE courses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug              TEXT NOT NULL UNIQUE,
    title             TEXT NOT NULL,
    summary           TEXT NOT NULL DEFAULT '',
    description       TEXT NOT NULL DEFAULT '',
    objectives        JSONB NOT NULL DEFAULT '[]'::jsonb,
    cover_image_url   TEXT,
    category_id       UUID REFERENCES course_categories (id),
    status            TEXT NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'published', 'archived')),
    price_type        TEXT NOT NULL DEFAULT 'free'
                      CHECK (price_type IN ('free', 'paid')),
    -- Minor units (kobo). NULL for free courses.
    price_amount      INTEGER CHECK (price_amount IS NULL OR price_amount >= 0),
    currency          TEXT NOT NULL DEFAULT 'NGN',
    duration_minutes  INTEGER,
    -- PRD §7.3: default pass mark 70%, configurable per course.
    pass_mark_percent SMALLINT NOT NULL DEFAULT 70
                      CHECK (pass_mark_percent BETWEEN 1 AND 100),
    certificate_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    published_at      TIMESTAMPTZ,
    legacy_moodle_id  INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- A paid course without a price is not sellable; reject it at the schema.
    CONSTRAINT courses_paid_needs_price
        CHECK (price_type = 'free' OR price_amount IS NOT NULL)
);

CREATE INDEX courses_published_idx ON courses (status, published_at DESC);
CREATE UNIQUE INDEX courses_legacy_moodle_id_key ON courses (legacy_moodle_id)
    WHERE legacy_moodle_id IS NOT NULL;

CREATE TABLE modules (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX modules_course_idx ON modules (course_id, position);

CREATE TABLE lessons (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id        UUID NOT NULL REFERENCES modules (id) ON DELETE CASCADE,
    title            TEXT NOT NULL,
    position         INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER,
    -- Required lessons gate course completion and therefore certification.
    is_required      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX lessons_module_idx ON lessons (module_id, position);

-- Gurucan-style lesson composition (PRD A2): a lesson is an ordered list of
-- typed blocks rather than one blob of HTML.
CREATE TABLE content_blocks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id  UUID NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
    type       TEXT NOT NULL
               CHECK (type IN ('rich_text', 'video', 'audio', 'image', 'pdf', 'slides', 'download', 'quiz')),
    position   INTEGER NOT NULL DEFAULT 0,
    payload    JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX content_blocks_lesson_idx ON content_blocks (lesson_id, position);

CREATE TABLE enrolments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id     UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    status        TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'cancelled')),
    source        TEXT NOT NULL DEFAULT 'self'
                  CHECK (source IN ('self', 'organisation', 'admin', 'migration')),
    enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ,
    legacy_moodle_id INTEGER,
    -- One enrolment per learner per course; re-enrolling reactivates this row.
    UNIQUE (user_id, course_id)
);

CREATE INDEX enrolments_user_idx ON enrolments (user_id, status);

CREATE TABLE lesson_progress (
    enrolment_id     UUID NOT NULL REFERENCES enrolments (id) ON DELETE CASCADE,
    lesson_id        UUID NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
    completed        BOOLEAN NOT NULL DEFAULT FALSE,
    position_seconds INTEGER NOT NULL DEFAULT 0,
    completed_at     TIMESTAMPTZ,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (enrolment_id, lesson_id)
);

-- M3 skeleton. Issuance logic arrives with the quiz engine.
CREATE TABLE certificate_templates (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  UUID REFERENCES courses (id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    config     JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE certificates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrolment_id    UUID NOT NULL REFERENCES enrolments (id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    course_id       UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    -- Printed on the certificate and typed into the public verification page.
    -- Must survive the Moodle import unchanged.
    verification_id TEXT NOT NULL UNIQUE,
    learner_name    TEXT NOT NULL,
    course_title    TEXT NOT NULL,
    score_percent   SMALLINT,
    status          TEXT NOT NULL DEFAULT 'valid'
                    CHECK (status IN ('valid', 'revoked')),
    storage_key     TEXT,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at      TIMESTAMPTZ,
    revoked_by      UUID REFERENCES users (id),
    revoked_reason  TEXT,
    legacy_moodle_id INTEGER,
    -- Issuance is idempotent: at most one certificate per enrolment.
    UNIQUE (enrolment_id)
);

-- M5 skeleton.
CREATE TABLE organisations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug       TEXT NOT NULL UNIQUE,
    name       TEXT NOT NULL,
    status     TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'approved', 'suspended')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organisation_memberships (
    organisation_id UUID NOT NULL REFERENCES organisations (id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role            TEXT NOT NULL DEFAULT 'member'
                    CHECK (role IN ('member', 'admin')),
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (organisation_id, user_id)
);

CREATE INDEX organisation_memberships_user_idx ON organisation_memberships (user_id);
