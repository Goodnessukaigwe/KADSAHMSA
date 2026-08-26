-- M4: school settings, certificate templates, and the learner's resume point.

-- Singleton row. A table rather than env vars because PRD A9 requires staff to
-- change branding and contact details themselves, without a redeploy.
CREATE TABLE school_settings (
    id                 BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
    site_name          TEXT NOT NULL DEFAULT 'KADSAMHSA Academy',
    tagline            TEXT NOT NULL DEFAULT '',
    logo_url           TEXT,
    primary_colour     TEXT NOT NULL DEFAULT '#0b4d2c',
    accent_colour      TEXT NOT NULL DEFAULT '#c9a227',
    contact_email      TEXT NOT NULL DEFAULT 'info@kadsamhsa.org',
    contact_phone      TEXT NOT NULL DEFAULT '',
    contact_address    TEXT NOT NULL DEFAULT 'Kaduna, Nigeria',
    custom_domain      TEXT,
    support_url        TEXT,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by         UUID REFERENCES users (id)
);

INSERT INTO school_settings (id) VALUES (TRUE);

-- certificate_templates already exists (002). Give it the fields the editor
-- needs so a template is not an opaque JSON blob the UI has to guess at.
ALTER TABLE certificate_templates
    ADD COLUMN title            TEXT NOT NULL DEFAULT 'Certificate of Completion',
    ADD COLUMN body             TEXT NOT NULL DEFAULT
        'This certifies that {{learner_name}} has successfully completed {{course_title}}.',
    ADD COLUMN background_url   TEXT,
    ADD COLUMN logo_url         TEXT,
    ADD COLUMN signatory_one    TEXT NOT NULL DEFAULT '',
    ADD COLUMN signatory_one_title TEXT NOT NULL DEFAULT '',
    ADD COLUMN signatory_two    TEXT NOT NULL DEFAULT '',
    ADD COLUMN signatory_two_title TEXT NOT NULL DEFAULT '',
    ADD COLUMN updated_at       TIMESTAMPTZ NOT NULL DEFAULT now();

-- One template per course; the editor upserts against this.
CREATE UNIQUE INDEX certificate_templates_course_key ON certificate_templates (course_id)
    WHERE course_id IS NOT NULL;

-- Where the learner left off, so the player can resume on any device (PRD F4).
-- Kept on the enrolment rather than inferred from lesson_progress, because
-- "last opened" is not the same as "last completed".
ALTER TABLE enrolments
    ADD COLUMN last_lesson_id UUID REFERENCES lessons (id) ON DELETE SET NULL,
    ADD COLUMN last_seen_at   TIMESTAMPTZ;

-- Certificate revocations are an audited, reversible-by-record action: the row
-- stays valid=false rather than being deleted, so a verification lookup can
-- still distinguish "revoked" from "never existed".
CREATE INDEX certificates_status_idx ON certificates (status, issued_at DESC);
