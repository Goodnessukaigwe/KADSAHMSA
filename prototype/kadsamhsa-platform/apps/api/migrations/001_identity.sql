-- M1: identity, roles, sessions, consents, audit log.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Stored as entered; uniqueness and lookup go through lower(email) below.
    email           TEXT NOT NULL,
    full_name       TEXT NOT NULL,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'suspended', 'deleted')),
    -- Set by the Moodle import so a re-run updates instead of duplicating.
    legacy_moodle_id INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_email_key ON users (lower(email));
CREATE UNIQUE INDEX users_legacy_moodle_id_key ON users (legacy_moodle_id)
    WHERE legacy_moodle_id IS NOT NULL;

-- Credentials are separate from the profile: migrated accounts exist with no
-- row here until the learner completes the mandatory password reset.
CREATE TABLE password_credentials (
    user_id       UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    password_hash TEXT NOT NULL,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
    key         TEXT PRIMARY KEY,
    description TEXT NOT NULL
);

INSERT INTO roles (key, description) VALUES
    ('learner',       'Enrols, learns, earns certificates'),
    ('org_admin',     'Administers one or more organisations'),
    ('content_admin', 'Creates and publishes courses'),
    ('super_admin',   'Full platform administration');

CREATE TABLE user_roles (
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    role_key    TEXT NOT NULL REFERENCES roles (key),
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    granted_by  UUID REFERENCES users (id),
    PRIMARY KEY (user_id, role_key)
);

-- One row per refresh token. Rotation inserts a replacement and marks the old
-- row revoked, so a replayed token is detectable rather than silently accepted.
CREATE TABLE sessions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL UNIQUE,
    user_agent         TEXT,
    ip_address         INET,
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    replaced_by        UUID REFERENCES sessions (id),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id) WHERE revoked_at IS NULL;

CREATE TABLE password_reset_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- NDPA: consent is captured explicitly, versioned, and never back-dated.
CREATE TABLE consents (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    policy_key     TEXT NOT NULL,
    policy_version TEXT NOT NULL,
    granted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address     INET
);

CREATE INDEX consents_user_id_idx ON consents (user_id);

-- Append-only. No UPDATE or DELETE path exists in application code.
CREATE TABLE audit_events (
    id           BIGSERIAL PRIMARY KEY,
    actor_id     UUID REFERENCES users (id),
    action       TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_id   TEXT,
    metadata     JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address   INET,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_actor_idx ON audit_events (actor_id, created_at DESC);
CREATE INDEX audit_events_subject_idx ON audit_events (subject_type, subject_id, created_at DESC);
