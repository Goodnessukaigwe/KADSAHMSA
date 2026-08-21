-- Per-user UI preferences. Replaces Moodle's user-preference API, which the
-- theme used for `theme_kadsamhsa_dash_onboarding`.
--
-- Keys are allow-listed in application code (apps/api/src/routes/me.ts) rather
-- than constrained here, so adding a preference needs no migration; the point
-- of the table is that preferences are per-user server state, not per-device
-- localStorage that silently resets when a learner switches phone.

CREATE TABLE user_preferences (
    user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    key        TEXT NOT NULL,
    value      JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, key)
);
