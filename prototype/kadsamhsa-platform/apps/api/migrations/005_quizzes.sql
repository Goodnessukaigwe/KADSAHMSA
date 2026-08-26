-- M3: question banks, quizzes, attempts and scoring (PRD F5, A3, §7.3).

CREATE TABLE question_banks (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id  UUID REFERENCES courses (id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX question_banks_course_idx ON question_banks (course_id);

CREATE TABLE questions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id    UUID NOT NULL REFERENCES question_banks (id) ON DELETE CASCADE,
    -- PRD A3: multiple choice, true/false, matching.
    type       TEXT NOT NULL CHECK (type IN ('mcq', 'multi', 'true_false', 'matching')),
    prompt     TEXT NOT NULL,
    feedback   TEXT NOT NULL DEFAULT '',
    position   INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX questions_bank_idx ON questions (bank_id, position);

-- One row per selectable choice. For `matching`, `match_key` holds the right-hand
-- term the option pairs with; for the other types it stays NULL and correctness
-- is carried by is_correct.
CREATE TABLE question_options (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    label       TEXT NOT NULL,
    is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
    match_key   TEXT,
    position    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX question_options_question_idx ON question_options (question_id, position);

CREATE TABLE quizzes (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id          UUID NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
    -- NULL for the course-level final assessment.
    module_id          UUID REFERENCES modules (id) ON DELETE CASCADE,
    title              TEXT NOT NULL,
    kind               TEXT NOT NULL DEFAULT 'module'
                       CHECK (kind IN ('module', 'final')),
    pass_mark_percent  SMALLINT NOT NULL DEFAULT 70
                       CHECK (pass_mark_percent BETWEEN 1 AND 100),
    -- NULL means unlimited retries (PRD F5 allows a configured limit).
    max_attempts       SMALLINT CHECK (max_attempts IS NULL OR max_attempts > 0),
    time_limit_minutes SMALLINT,
    -- How many questions to draw from the pool; NULL uses all of them.
    question_count     SMALLINT,
    randomise          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX quizzes_course_idx ON quizzes (course_id);
-- At most one final assessment per course: certification keys off it.
CREATE UNIQUE INDEX quizzes_one_final_per_course ON quizzes (course_id)
    WHERE kind = 'final';

CREATE TABLE quiz_questions (
    quiz_id     UUID NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    position    INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (quiz_id, question_id)
);

CREATE TABLE quiz_attempts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id       UUID NOT NULL REFERENCES quizzes (id) ON DELETE CASCADE,
    enrolment_id  UUID NOT NULL REFERENCES enrolments (id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    attempt_no    SMALLINT NOT NULL,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    submitted_at  TIMESTAMPTZ,
    score_percent SMALLINT,
    passed        BOOLEAN,
    -- Snapshot of the served question order, so a randomised attempt scores
    -- against exactly what the learner saw.
    served        JSONB NOT NULL DEFAULT '[]'::jsonb,
    UNIQUE (quiz_id, enrolment_id, attempt_no)
);

CREATE INDEX quiz_attempts_enrolment_idx ON quiz_attempts (enrolment_id, quiz_id);

CREATE TABLE quiz_answers (
    attempt_id  UUID NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
    -- Shape depends on question type: option id(s), or matching pairs.
    response    JSONB NOT NULL,
    is_correct  BOOLEAN NOT NULL,
    PRIMARY KEY (attempt_id, question_id)
);
