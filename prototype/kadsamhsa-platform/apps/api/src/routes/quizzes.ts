import { randomInt } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type {
  QuestionType,
  Quiz,
  QuizAttempt,
  QuizAttemptResult,
  QuizOption,
  QuizQuestion,
  QuizQuestionResult,
  QuizResponse,
  QuizStatus,
} from '@kadsamhsa/domain';
import { ApiError, notFound } from '@kadsamhsa/domain';
import { recordAudit } from '../audit.js';
import { generateVerificationId } from '../auth/tokens.js';
import { query, queryOne, transaction } from '../db/pool.js';

/**
 * Learner quiz engine (PRD F5, §7.3).
 *
 * Two invariants shape everything here:
 *
 *  1. Nothing the learner receives before scoring may contain the answer key.
 *     `is_correct` and `match_key` are never selected by the attempt query, so
 *     a future refactor of the mapping functions cannot leak them by accident.
 *  2. An attempt is scored against the questions it actually served, snapshotted
 *     in `quiz_attempts.served`. A randomised quiz whose pool changes mid-attempt
 *     must still grade the learner on what they saw.
 */

/** Absorbs clock skew and the submit request's own flight time. */
const LATE_GRACE_MS = 30_000;

const quizResponseSchema = z.object({
  questionId: z.string().uuid(),
  /** mcq / multi / true_false. */
  optionIds: z.array(z.string().uuid()).max(50).optional(),
  /** matching: left-hand option to the right-hand term the learner chose. */
  pairs: z
    .array(
      z.object({
        optionId: z.string().uuid(),
        matchTarget: z.string().max(500),
      }),
    )
    .max(50)
    .optional(),
});

const submitSchema = z.object({
  responses: z.array(quizResponseSchema).max(200).default([]),
});

interface QuizRow {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  kind: 'module' | 'final';
  pass_mark_percent: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  question_count: number | null;
  randomise: boolean;
}

interface QuizStatusRow {
  id: string;
  title: string;
  kind: 'module' | 'final';
  module_id: string | null;
  max_attempts: number | null;
  attempts_used: string;
  best_score: number | null;
  passed: boolean;
  unlocked: boolean;
}

/** A question as served to the browser. Deliberately carries no feedback text. */
interface ServedQuestionRow {
  id: string;
  type: QuestionType;
  prompt: string;
}

/** An option as served to the browser. Deliberately carries no `is_correct`. */
interface ServedOptionRow {
  id: string;
  question_id: string;
  label: string;
  match_key: string | null;
}

/** The answer key, loaded only on submit. */
interface KeyOptionRow {
  id: string;
  question_id: string;
  is_correct: boolean;
  match_key: string | null;
}

interface AttemptRow {
  id: string;
  quiz_id: string;
  enrolment_id: string;
  attempt_no: number;
  started_at: Date;
  submitted_at: Date | null;
  served: unknown;
  kind: 'module' | 'final';
  pass_mark_percent: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  course_id: string;
  course_title: string;
  certificate_enabled: boolean;
  learner_name: string;
}

/** NULL `max_attempts` means unlimited retries. */
function remainingAttempts(maxAttempts: number | null, used: number): number | null {
  return maxAttempts === null ? null : Math.max(0, maxAttempts - used);
}

/** Fisher-Yates over a CSPRNG: question order must not be predictable. */
function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const left = out[i]!;
    const right = out[j]!;
    out[i] = right;
    out[j] = left;
  }
  return out;
}

/**
 * The right-hand term an option pairs with, or null when it is a distractor.
 * Serving, grading and result mapping all go through this so a blank or
 * whitespace-only `match_key` cannot be pairable in one place and not another.
 */
function matchKeyOf(option: { match_key: string | null }): string | null {
  const key = option.match_key?.trim() ?? '';
  return key.length > 0 ? key : null;
}

function toQuiz(row: QuizRow, servedCount: number): Quiz {
  return {
    id: row.id,
    courseId: row.course_id,
    moduleId: row.module_id,
    title: row.title,
    kind: row.kind,
    passMarkPercent: row.pass_mark_percent,
    maxAttempts: row.max_attempts,
    timeLimitMinutes: row.time_limit_minutes,
    // What this attempt actually serves, which is not the configured pool size
    // once `question_count` draws a subset.
    questionCount: servedCount,
  };
}

function toLearnerQuestion(row: ServedQuestionRow, options: ServedOptionRow[]): QuizQuestion {
  const learnerOptions: QuizOption[] = options.map((option) => ({
    id: option.id,
    label: option.label,
  }));

  if (row.type !== 'matching') {
    return { id: row.id, type: row.type, prompt: row.prompt, options: learnerOptions };
  }

  // `matchTarget` stays off the options: pairing an option with its own target
  // in the payload would hand over the answer. The terms go out as a separate
  // shuffled list, so their order cannot be read back as the pairing either.
  const targets = shuffle(
    Array.from(new Set(options.map(matchKeyOf).filter((key): key is string => key !== null))),
  );

  return {
    id: row.id,
    type: row.type,
    prompt: row.prompt,
    options: learnerOptions,
    matchTargets: targets,
  };
}

function groupByQuestion<T extends { question_id: string }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const existing = grouped.get(row.question_id);
    if (existing) {
      existing.push(row);
    } else {
      grouped.set(row.question_id, [row]);
    }
  }
  return grouped;
}

function setsMatch(expected: Set<string>, given: Set<string>): boolean {
  if (expected.size !== given.size) {
    return false;
  }
  for (const value of expected) {
    if (!given.has(value)) {
      return false;
    }
  }
  return true;
}

/**
 * A question is correct only on an exact match: partial credit does not exist
 * anywhere in the PRD, and awarding it silently would move the effective pass
 * mark away from the one the course advertises.
 */
function gradeQuestion(
  type: QuestionType,
  options: KeyOptionRow[],
  response: QuizResponse | undefined,
): boolean {
  if (type === 'matching') {
    const pairable = options
      .map((option) => ({ id: option.id, key: matchKeyOf(option) }))
      .filter((option): option is { id: string; key: string } => option.key !== null);
    const pairs = response?.pairs ?? [];
    if (pairable.length === 0 || pairs.length !== pairable.length) {
      return false;
    }

    const chosen = new Map<string, string>();
    for (const pair of pairs) {
      // A repeated option id would let one correct pair stand in for two.
      if (chosen.has(pair.optionId)) {
        return false;
      }
      chosen.set(pair.optionId, pair.matchTarget.trim());
    }

    return pairable.every((option) => chosen.get(option.id) === option.key);
  }

  const expected = new Set(options.filter((option) => option.is_correct).map((o) => o.id));
  // A question with no correct option is a content error; scoring it as correct
  // would hand out free marks to everyone who left it blank.
  if (expected.size === 0) {
    return false;
  }
  return setsMatch(expected, new Set(response?.optionIds ?? []));
}

function correctOptionIds(type: QuestionType, options: KeyOptionRow[]): string[] {
  // A matching answer is a pairing, which `QuizQuestionResult` cannot express.
  // Return the options that carry a pair so the client can highlight them next
  // to the question's written feedback.
  if (type === 'matching') {
    return options.filter((option) => matchKeyOf(option) !== null).map((option) => option.id);
  }
  return options.filter((option) => option.is_correct).map((option) => option.id);
}

export async function quizRoutes(app: FastifyInstance) {
  app.get<{ Params: { courseId: string } }>('/courses/:courseId/quizzes', {
    preHandler: app.requirePermission('quiz:attempt'),
    handler: async (request): Promise<QuizStatus[]> => {
      const enrolment = await queryOne<{ id: string }>(
        `SELECT id FROM enrolments
          WHERE course_id = $1 AND user_id = $2 AND status = 'active'`,
        [request.params.courseId, request.currentUser!.id],
      );

      if (!enrolment) {
        throw notFound('Course not found for an active enrolment');
      }

      // `unlocked` gates a module quiz on that module's required lessons and a
      // course-level quiz on every required lesson — the same condition that
      // gates certification, so the outline never promises a final assessment
      // that would not produce a certificate.
      const rows = await query<QuizStatusRow>(
        `SELECT q.id, q.title, q.kind, q.module_id, q.max_attempts,
                (SELECT count(*) FROM quiz_attempts a
                  WHERE a.quiz_id = q.id AND a.enrolment_id = $2) AS attempts_used,
                (SELECT max(a.score_percent) FROM quiz_attempts a
                  WHERE a.quiz_id = q.id AND a.enrolment_id = $2
                    AND a.submitted_at IS NOT NULL) AS best_score,
                EXISTS (SELECT 1 FROM quiz_attempts a
                         WHERE a.quiz_id = q.id AND a.enrolment_id = $2 AND a.passed) AS passed,
                NOT EXISTS (
                  SELECT 1
                    FROM lessons l
                    JOIN modules m ON m.id = l.module_id
                    LEFT JOIN lesson_progress lp
                           ON lp.lesson_id = l.id AND lp.enrolment_id = $2
                   WHERE l.is_required
                     AND lp.completed IS DISTINCT FROM TRUE
                     AND CASE WHEN q.module_id IS NULL
                              THEN m.course_id = q.course_id
                              ELSE m.id = q.module_id
                         END
                ) AS unlocked
           FROM quizzes q
           LEFT JOIN modules mo ON mo.id = q.module_id
          WHERE q.course_id = $1
          ORDER BY (q.kind = 'final'), mo.position NULLS LAST, q.title`,
        [request.params.courseId, enrolment.id],
      );

      return rows.map((row) => {
        const attemptsUsed = Number(row.attempts_used);
        return {
          quizId: row.id,
          title: row.title,
          kind: row.kind,
          moduleId: row.module_id,
          attemptsUsed,
          attemptsRemaining: remainingAttempts(row.max_attempts, attemptsUsed),
          bestScorePercent: row.best_score,
          passed: row.passed,
          unlocked: row.unlocked,
        };
      });
    },
  });

  app.post<{ Params: { quizId: string } }>('/quizzes/:quizId/attempts', {
    preHandler: app.requirePermission('quiz:attempt'),
    handler: async (request, reply) => {
      const user = request.currentUser!;

      // The enrolment is joined through the quiz's own course, so the caller
      // never gets to say which course they are attempting.
      const quiz = await queryOne<QuizRow & { enrolment_id: string; unlocked: boolean }>(
        `SELECT q.id, q.course_id, q.module_id, q.title, q.kind, q.pass_mark_percent,
                q.max_attempts, q.time_limit_minutes, q.question_count, q.randomise,
                e.id AS enrolment_id,
                NOT EXISTS (
                  SELECT 1
                    FROM lessons l
                    JOIN modules m ON m.id = l.module_id
                    LEFT JOIN lesson_progress lp
                           ON lp.lesson_id = l.id AND lp.enrolment_id = e.id
                   WHERE l.is_required
                     AND lp.completed IS DISTINCT FROM TRUE
                     AND CASE WHEN q.module_id IS NULL
                              THEN m.course_id = q.course_id
                              ELSE m.id = q.module_id
                         END
                ) AS unlocked
           FROM quizzes q
           JOIN enrolments e ON e.course_id = q.course_id
          WHERE q.id = $1 AND e.user_id = $2 AND e.status = 'active'`,
        [request.params.quizId, user.id],
      );

      if (!quiz) {
        throw notFound('Quiz not found for an active enrolment');
      }

      // The same condition GET /courses/:id/quizzes reports as `unlocked` has to
      // be enforced here too. Reporting it without enforcing it made the lock
      // advisory: a learner could skip the coursework, burn attempts and read
      // the question bank before doing any of the lessons the assessment is
      // meant to test.
      if (!quiz.unlocked) {
        throw new ApiError(
          'forbidden',
          'Complete the required lessons before taking this assessment.',
        );
      }

      const usedRow = await queryOne<{ used: string }>(
        `SELECT count(*) AS used
           FROM quiz_attempts
          WHERE quiz_id = $1 AND enrolment_id = $2`,
        [quiz.id, quiz.enrolment_id],
      );
      const used = Number(usedRow?.used ?? 0);

      if (quiz.max_attempts !== null && used >= quiz.max_attempts) {
        throw new ApiError(
          'forbidden',
          `You have used all ${quiz.max_attempts} attempts for this quiz.`,
        );
      }

      const available = await query<ServedQuestionRow>(
        `SELECT qs.id, qs.type, qs.prompt
           FROM quiz_questions qq
           JOIN questions qs ON qs.id = qq.question_id
          WHERE qq.quiz_id = $1
          ORDER BY qq.position, qs.position, qs.id`,
        [quiz.id],
      );

      const ordered = quiz.randomise ? shuffle(available) : available;
      const served =
        quiz.question_count !== null && quiz.question_count > 0
          ? ordered.slice(0, quiz.question_count)
          : ordered;

      if (served.length === 0) {
        throw new ApiError('conflict', 'This quiz has no questions yet.');
      }

      const servedIds = served.map((question) => question.id);
      const optionRows = await query<ServedOptionRow>(
        `SELECT id, question_id, label, match_key
           FROM question_options
          WHERE question_id = ANY($1::uuid[])
          ORDER BY question_id, position, id`,
        [servedIds],
      );
      const optionsByQuestion = groupByQuestion(optionRows);

      const attemptNo = used + 1;
      let started: { id: string; started_at: Date } | null;
      try {
        started = await queryOne<{ id: string; started_at: Date }>(
          `INSERT INTO quiz_attempts (quiz_id, enrolment_id, user_id, attempt_no, served)
           VALUES ($1, $2, $3, $4, $5::jsonb)
           RETURNING id, started_at`,
          [quiz.id, quiz.enrolment_id, user.id, attemptNo, JSON.stringify(servedIds)],
        );
      } catch (error) {
        // UNIQUE (quiz_id, enrolment_id, attempt_no): two tabs starting the same
        // attempt at once. Failing here is what keeps `max_attempts` honest
        // under a race, so surface it rather than reusing the number.
        if ((error as { code?: string }).code === '23505') {
          throw new ApiError('conflict', 'Another attempt was started at the same time. Try again.');
        }
        throw error;
      }

      if (!started) {
        throw new ApiError('internal_error', 'Could not start the attempt');
      }

      const attempt: QuizAttempt = {
        id: started.id,
        quiz: toQuiz(quiz, served.length),
        attemptNo,
        attemptsRemaining: remainingAttempts(quiz.max_attempts, attemptNo),
        startedAt: started.started_at.toISOString(),
        expiresAt:
          quiz.time_limit_minutes === null
            ? null
            : new Date(
                started.started_at.getTime() + quiz.time_limit_minutes * 60_000,
              ).toISOString(),
        questions: served.map((question) =>
          toLearnerQuestion(question, optionsByQuestion.get(question.id) ?? []),
        ),
      };

      return reply.status(201).send(attempt);
    },
  });

  app.post<{ Params: { attemptId: string } }>('/quiz-attempts/:attemptId/submit', {
    preHandler: app.requirePermission('quiz:attempt'),
    handler: async (request): Promise<QuizAttemptResult> => {
      const user = request.currentUser!;
      const input = submitSchema.parse(request.body ?? {});

      const attempt = await queryOne<AttemptRow>(
        `SELECT a.id, a.quiz_id, a.enrolment_id, a.attempt_no, a.started_at,
                a.submitted_at, a.served,
                q.kind, q.pass_mark_percent, q.max_attempts, q.time_limit_minutes,
                q.course_id,
                c.title AS course_title, c.certificate_enabled,
                u.full_name AS learner_name
           FROM quiz_attempts a
           JOIN quizzes q ON q.id = a.quiz_id
           JOIN courses c ON c.id = q.course_id
           JOIN enrolments e ON e.id = a.enrolment_id
           JOIN users u ON u.id = a.user_id
          WHERE a.id = $1 AND a.user_id = $2 AND e.status = 'active'`,
        [request.params.attemptId, user.id],
      );

      if (!attempt) {
        throw notFound('Attempt not found');
      }
      if (attempt.submitted_at !== null) {
        throw new ApiError('conflict', 'This attempt has already been submitted.');
      }

      const servedIds = Array.isArray(attempt.served)
        ? attempt.served.filter((id: unknown): id is string => typeof id === 'string')
        : [];
      if (servedIds.length === 0) {
        throw new ApiError('conflict', 'This attempt has no questions to score.');
      }

      const questionRows = await query<{
        id: string;
        type: QuestionType;
        prompt: string;
        feedback: string;
      }>(`SELECT id, type, prompt, feedback FROM questions WHERE id = ANY($1::uuid[])`, [
        servedIds,
      ]);
      const questionById = new Map(questionRows.map((row) => [row.id, row]));

      const keyRows = await query<KeyOptionRow>(
        `SELECT id, question_id, is_correct, match_key
           FROM question_options
          WHERE question_id = ANY($1::uuid[])
          ORDER BY question_id, position, id`,
        [servedIds],
      );
      const keyByQuestion = groupByQuestion(keyRows);

      // Responses for anything outside the snapshot are dropped: a client that
      // posts an unserved question id must not be able to add to its own score.
      const responseByQuestion = new Map<string, QuizResponse>(
        input.responses.map((response) => [response.questionId, response]),
      );

      const questionResults: QuizQuestionResult[] = [];
      const answerRows: { questionId: string; response: string; isCorrect: boolean }[] = [];
      let correctCount = 0;

      for (const questionId of servedIds) {
        const question = questionById.get(questionId);

        if (!question) {
          // Deleted by a content admin mid-attempt. It still counts towards the
          // total — dropping it would inflate the score — but `quiz_answers` has
          // a foreign key to `questions`, so no answer row can be written.
          questionResults.push({
            questionId,
            prompt: '',
            isCorrect: false,
            feedback: 'This question was withdrawn after your attempt began.',
            correctOptionIds: [],
          });
          continue;
        }

        const options = keyByQuestion.get(questionId) ?? [];
        const response = responseByQuestion.get(questionId);
        const isCorrect = gradeQuestion(question.type, options, response);

        if (isCorrect) {
          correctCount += 1;
        }

        questionResults.push({
          questionId,
          prompt: question.prompt,
          isCorrect,
          feedback: question.feedback,
          correctOptionIds: correctOptionIds(question.type, options),
        });

        // Unanswered served questions get a row too, so the stored attempt is a
        // complete record of what was asked rather than only what came back.
        answerRows.push({
          questionId,
          response: JSON.stringify(
            question.type === 'matching'
              ? { pairs: response?.pairs ?? [] }
              : { optionIds: response?.optionIds ?? [] },
          ),
          isCorrect,
        });
      }

      const totalCount = servedIds.length;
      const scorePercent = Math.round((correctCount / totalCount) * 100);
      const passed = scorePercent >= attempt.pass_mark_percent;

      const late =
        attempt.time_limit_minutes !== null &&
        Date.now() >
          attempt.started_at.getTime() + attempt.time_limit_minutes * 60_000 + LATE_GRACE_MS;

      const outcome = await transaction(async (client) => {
        // `submitted_at IS NULL` in the predicate, not just the earlier read:
        // two submits in flight together must not both write answers.
        const closed = await client.query<{ submitted_at: Date }>(
          `UPDATE quiz_attempts
              SET submitted_at = now(), score_percent = $2, passed = $3
            WHERE id = $1 AND submitted_at IS NULL
            RETURNING submitted_at`,
          [attempt.id, scorePercent, passed],
        );
        const closedRow = closed.rows[0];
        if (!closedRow) {
          throw new ApiError('conflict', 'This attempt has already been submitted.');
        }

        for (const row of answerRows) {
          await client.query(
            `INSERT INTO quiz_answers (attempt_id, question_id, response, is_correct)
             VALUES ($1, $2, $3::jsonb, $4)
             ON CONFLICT (attempt_id, question_id)
             DO UPDATE SET response = EXCLUDED.response, is_correct = EXCLUDED.is_correct`,
            [attempt.id, row.questionId, row.response, row.isCorrect],
          );
        }

        if (late) {
          // The time limit is not enforced by refusing the submission: that
          // would discard the learner's work and burn the attempt with nothing
          // recorded. It is enforced by closing the attempt and logging that it
          // ran over, so an overrun is visible rather than silently allowed.
          await recordAudit(
            {
              actorId: user.id,
              action: 'quiz.attempt.submitted_late',
              subjectType: 'quiz_attempt',
              subjectId: attempt.id,
              metadata: {
                quizId: attempt.quiz_id,
                timeLimitMinutes: attempt.time_limit_minutes,
                startedAt: attempt.started_at.toISOString(),
              },
              ipAddress: request.ip,
            },
            client,
          );
        }

        if (!passed || attempt.kind !== 'final' || !attempt.certificate_enabled) {
          return { submittedAt: closedRow.submitted_at, verificationId: null };
        }

        // PRD §7.3: the final assessment is the last gate, not the only one.
        // Required content must be finished before a certificate exists.
        const outstanding = await client.query<{ pending: string }>(
          `SELECT count(*) AS pending
             FROM lessons l
             JOIN modules m ON m.id = l.module_id
             LEFT JOIN lesson_progress lp
                    ON lp.lesson_id = l.id AND lp.enrolment_id = $1
            WHERE m.course_id = $2
              AND l.is_required
              AND lp.completed IS DISTINCT FROM TRUE`,
          [attempt.enrolment_id, attempt.course_id],
        );

        if (Number(outstanding.rows[0]?.pending ?? 0) > 0) {
          return { submittedAt: closedRow.submitted_at, verificationId: null };
        }

        const issued = await client.query<{ id: string; verification_id: string }>(
          `INSERT INTO certificates
             (enrolment_id, user_id, course_id, verification_id,
              learner_name, course_title, score_percent)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (enrolment_id) DO NOTHING
           RETURNING id, verification_id`,
          [
            attempt.enrolment_id,
            user.id,
            attempt.course_id,
            generateVerificationId(),
            attempt.learner_name,
            attempt.course_title,
            scorePercent,
          ],
        );

        await client.query(
          `UPDATE enrolments
              SET status = 'completed', completed_at = COALESCE(completed_at, now())
            WHERE id = $1 AND status = 'active'`,
          [attempt.enrolment_id],
        );

        const certificate = issued.rows[0];
        if (!certificate) {
          // UNIQUE (enrolment_id) absorbed the insert: the learner passed the
          // final again. Return the certificate they already hold, and log
          // nothing — it was issued once, on the attempt that earned it.
          const existing = await client.query<{ verification_id: string }>(
            `SELECT verification_id FROM certificates WHERE enrolment_id = $1`,
            [attempt.enrolment_id],
          );
          return {
            submittedAt: closedRow.submitted_at,
            verificationId: existing.rows[0]?.verification_id ?? null,
          };
        }

        await recordAudit(
          {
            actorId: user.id,
            action: 'certificate.issued',
            subjectType: 'certificate',
            subjectId: certificate.id,
            metadata: {
              enrolmentId: attempt.enrolment_id,
              courseId: attempt.course_id,
              quizId: attempt.quiz_id,
              attemptId: attempt.id,
              verificationId: certificate.verification_id,
              scorePercent,
            },
            ipAddress: request.ip,
          },
          client,
        );

        return {
          submittedAt: closedRow.submitted_at,
          verificationId: certificate.verification_id,
        };
      });

      if (late) {
        request.log.warn(
          { attemptId: attempt.id, quizId: attempt.quiz_id, userId: user.id },
          'quiz attempt submitted after its time limit',
        );
      }

      return {
        attemptId: attempt.id,
        scorePercent,
        passed,
        passMarkPercent: attempt.pass_mark_percent,
        correctCount,
        totalCount,
        attemptsRemaining: remainingAttempts(attempt.max_attempts, attempt.attempt_no),
        submittedAt: outcome.submittedAt.toISOString(),
        questions: questionResults,
        ...(outcome.verificationId
          ? { certificateVerificationId: outcome.verificationId }
          : {}),
      };
    },
  });
}
