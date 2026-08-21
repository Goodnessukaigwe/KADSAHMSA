-- Featured courses (PRD A5: "categories/tags, featured courses").
--
-- The new-learner dashboard hero pitches a specific recommended course, so the
-- choice has to be editorial rather than "whatever sorts first".

ALTER TABLE courses ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX courses_featured_idx ON courses (is_featured, published_at DESC)
    WHERE is_featured AND status = 'published';
