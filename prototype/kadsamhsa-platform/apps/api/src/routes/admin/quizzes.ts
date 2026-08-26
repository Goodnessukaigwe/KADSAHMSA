import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import type { AdminQuestion, AdminQuiz, QuestionType, QuizKind } from '@kadsamhsa/domain';
import { ApiError, notFound } from '@kadsamhsa/domain';
import { recordAudit } from '../../audit.js';
import { query, queryOne, transaction } from '../../db/pool.js';
import type { QueryParam } from '../../db/pool.js';

/**
 * Quiz and question-bank builder (PRD A3).
 *
 * Questions live in a per-course `question_banks` row; `quiz_questions` links
 * them to a quiz with a position. That indirection is what lets the same
 * question appear on a module quiz and the final assessment, so nothing here
 * assumes a question belongs to exactly one quiz.
 *
 * Everything in this file returns the answer key. That is deliberate and is
 * why every route demands `quiz:manage` — the learner-facing shapes in
 * `@kadsamhsa/domain` omit correctness precisely because these do not.
 */

interface QuizRow {
  id: string;
  course_id: string;
  module_id: string | null;
  title: string;
  kind: QuizKind;
  pass_mark_percent: number;
  max_attempts: number | null;
  time_limit_minutes: number | null;
  question_count: number | null;
  randomise: boolean;
}

interface QuestionRow {
  quiz_id: string;
  question_id: string;
  type: QuestionType;
  prompt: string;
  feedback: string;
  position: number;
  option_id: string | null;
  option_label: string | null;
  option_is_correct: boolean | null;
  option_match_key: string | null;
  option_position: number | null;
}

const QUIZ_SELECT = `
  SELECT q.id, q.course_id, q.module_id, q.title, q.kind, q.pass_mark_percent,
         q.max_attempts, q.time_limit_minutes, q.question_count, q.randomise
    FROM quizzes q
`;

const uuidSchema = z.uuid();

const optionInputSchema = z.object({
  label: z.string().trim().min(1, 'Every option needs a label').max(500),
  isCorrect: z.boolean().default(false),
  /** Required for matching questions, ignored by the other types. */
  matchKey: z.string().trim().max(500).nullish(),
});

/**
 * The answer-key rules. An assessment that cannot be answered correctly is
 * worse than no assessment at all — it fails every learner and only surfaces
 * once someone sits it — so each message names the exact defect rather than
 * saying "invalid question".
 */
const questionSchema = z
  .object({
    type: z.enum(['mcq', 'multi', 'true_false', 'matching']),
    prompt: z.string().trim().min(1, 'Enter the question prompt').max(2000),
    feedback: z.string().trim().max(2000).default(''),
    options: z.array(optionInputSchema).max(20, 'A question can have at most 20 options'),
  })
  .superRefine((question, ctx) => {
    const total = question.options.length;
    const correct = question.options.filter((option) => option.isCorrect).length;
    const fail = (message: string, path: (string | number)[] = ['options']) => {
      ctx.addIssue({ code: 'custom', message, path });
    };

    switch (question.type) {
      case 'true_false':
        if (total !== 2) {
          fail(`A true/false question needs exactly 2 options, but this one has ${total}`);
        }
        if (correct !== 1) {
          fail(
            `Exactly one of the two options must be marked correct, but ${correct} ${
              correct === 1 ? 'is' : 'are'
            }`,
          );
        }
        break;
      case 'mcq':
        if (total < 2) {
          fail(`A multiple-choice question needs at least 2 options, but this one has ${total}`);
        }
        if (correct !== 1) {
          fail(
            correct === 0
              ? 'Mark exactly one option correct — a multiple-choice question with no correct answer cannot be passed'
              : `A multiple-choice question takes exactly one correct answer, but ${correct} options are marked correct — use the multi-select type for several`,
          );
        }
        break;
      case 'multi':
        if (total < 2) {
          fail(`A multi-select question needs at least 2 options, but this one has ${total}`);
        }
        if (correct < 1) {
          fail('Mark at least one option correct — a multi-select question with no correct answer cannot be passed');
        }
        break;
      case 'matching':
        if (total < 2) {
          fail(`A matching question needs at least 2 pairs, but this one has ${total}`);
        }
        question.options.forEach((option, index) => {
          if (!option.matchKey) {
            fail(
              `Every matching option needs the term it pairs with; "${
                option.label || `option ${index + 1}`
              }" has none`,
              ['options', index, 'matchKey'],
            );
          }
        });
        break;
    }
  });

/**
 * PATCH bodies are partial, but the answer-key rules are cross-field: the
 * incoming fields are merged over the stored question and the whole result is
 * put through `questionSchema`, so a type change can never leave the stored
 * options behind in a shape that type forbids.
 */
const questionPatchSchema = z.object({
  type: z.enum(['mcq', 'multi', 'true_false', 'matching']).optional(),
  prompt: z.string().trim().min(1, 'Enter the question prompt').max(2000).optional(),
  feedback: z.string().trim().max(2000).optional(),
  options: z.array(optionInputSchema).max(20, 'A question can have at most 20 options').optional(),
});

const quizFieldsSchema = z.object({
  title: z.string().trim().min(1, 'Enter a quiz title').max(200),
  kind: z.enum(['module', 'final']),
  moduleId: z.uuid('Choose a valid module').nullish(),
  passMarkPercent: z.number().int().min(1).max(100),
  maxAttempts: z.number().int().min(1).max(50).nullish(),
  timeLimitMinutes: z.number().int().min(1).max(600).nullish(),
  /** How many questions to draw from the pool; null uses all of them. */
  questionCount: z.number().int().min(1).max(200).nullish(),
  randomise: z.boolean(),
});

const quizCreateSchema = quizFieldsSchema.extend({
  kind: quizFieldsSchema.shape.kind.default('module'),
  /** Unset means "inherit the course pass mark", resolved in the handler. */
  passMarkPercent: quizFieldsSchema.shape.passMarkPercent.optional(),
  randomise: quizFieldsSchema.shape.randomise.default(false),
});

const quizPatchSchema = quizFieldsSchema.partial();

type OptionInput = z.infer<typeof optionInputSchema>;

/**
 * A malformed id can never match a row, and Postgres rejects it with a type
 * error before we get to ask — so treat it as a miss rather than a 500.
 */
function requireId(value: string, message: string): string {
  if (!uuidSchema.safeParse(value).success) {
    throw notFound(message);
  }
  return value;
}

/**
 * `quizzes_one_final_per_course` is the only unique index on the table, so a
 * unique violation from a quiz write is always a second final assessment.
 */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === '23505'
  );
}

const DUPLICATE_FINAL = new ApiError('conflict', 'This course already has a final assessment');

function toQuiz(row: QuizRow, questions: AdminQuestion[]): AdminQuiz {
  return {
    id: row.id,
    courseId: row.course_id,
    moduleId: row.module_id,
    title: row.title,
    kind: row.kind,
    passMarkPercent: row.pass_mark_percent,
    maxAttempts: row.max_attempts,
    timeLimitMinutes: row.time_limit_minutes,
    questionCount: row.question_count,
    randomise: row.randomise,
    questions,
  };
}

async function withQuestions(rows: QuizRow[]): Promise<AdminQuiz[]> {
  if (rows.length === 0) {
    return [];
  }

  const questionRows = await query<QuestionRow>(
    `SELECT qq.quiz_id, qq.position, ques.id AS question_id, ques.type, ques.prompt,
            ques.feedback, o.id AS option_id, o.label AS option_label,
            o.is_correct AS option_is_correct, o.match_key AS option_match_key,
            o.position AS option_position
       FROM quiz_questions qq
       JOIN questions ques ON ques.id = qq.question_id
       LEFT JOIN question_options o ON o.question_id = ques.id
      WHERE qq.quiz_id = ANY($1::uuid[])
      ORDER BY qq.position, ques.created_at, o.position`,
    [rows.map((row) => row.id)],
  );

  const byQuiz = new Map<string, AdminQuestion[]>();
  // Keyed by quiz *and* question: a bank question shared by two quizzes must
  // appear under both, not just whichever row came back first.
  const seen = new Map<string, AdminQuestion>();

  for (const row of questionRows) {
    const key = `${row.quiz_id}:${row.question_id}`;
    let question = seen.get(key);
    if (!question) {
      question = {
        id: row.question_id,
        type: row.type,
        prompt: row.prompt,
        feedback: row.feedback,
        position: row.position,
        options: [],
      };
      seen.set(key, question);
      const list = byQuiz.get(row.quiz_id) ?? [];
      list.push(question);
      byQuiz.set(row.quiz_id, list);
    }
    if (row.option_id !== null) {
      question.options.push({
        id: row.option_id,
        label: row.option_label ?? '',
        isCorrect: row.option_is_correct ?? false,
        matchKey: row.option_match_key,
        position: row.option_position ?? 0,
      });
    }
  }

  return rows.map((row) => toQuiz(row, byQuiz.get(row.id) ?? []));
}

async function loadQuiz(quizId: string): Promise<AdminQuiz> {
  const rows = await query<QuizRow>(`${QUIZ_SELECT} WHERE q.id = $1`, [quizId]);
  const quizzes = await withQuestions(rows);
  const quiz = quizzes[0];
  if (!quiz) {
    throw notFound('Quiz not found');
  }
  return quiz;
}

/** Every course gets one bank; the first quiz on a course creates it. */
async function ensureQuestionBank(
  client: PoolClient,
  courseId: string,
  courseTitle: string,
): Promise<string> {
  const existing = await client.query<{ id: string }>(
    `SELECT id FROM question_banks WHERE course_id = $1 ORDER BY created_at LIMIT 1`,
    [courseId],
  );
  const found = existing.rows[0];
  if (found) {
    return found.id;
  }

  const created = await client.query<{ id: string }>(
    `INSERT INTO question_banks (course_id, name) VALUES ($1, $2) RETURNING id`,
    [courseId, `${courseTitle} question bank`],
  );
  return created.rows[0]!.id;
}

async function insertOptions(
  client: PoolClient,
  questionId: string,
  options: OptionInput[],
): Promise<void> {
  const payload = options.map((option, index) => ({
    label: option.label,
    is_correct: option.isCorrect,
    match_key: option.matchKey ?? null,
    position: index,
  }));

  await client.query(
    `INSERT INTO question_options (question_id, label, is_correct, match_key, position)
     SELECT $1, o.label, o.is_correct, o.match_key, o.position
       FROM jsonb_to_recordset($2::jsonb)
            AS o(label text, is_correct boolean, match_key text, position int)`,
    [questionId, JSON.stringify(payload)],
  );
}

/** A module quiz may only point at a module of its own course. */
async function assertModuleOnCourse(moduleId: string, courseId: string): Promise<void> {
  const found = await queryOne<{ id: string }>(
    `SELECT id FROM modules WHERE id = $1 AND course_id = $2`,
    [moduleId, courseId],
  );
  if (!found) {
    throw notFound('Module not found on this course');
  }
}

export async function adminQuizRoutes(app: FastifyInstance) {
  app.get<{ Params: { courseId: string } }>('/admin/courses/:courseId/quizzes', {
    preHandler: app.requirePermission('quiz:manage'),
    handler: async (request) => {
      const courseId = requireId(request.params.courseId, 'Course not found');

      const course = await queryOne<{ id: string }>(`SELECT id FROM courses WHERE id = $1`, [
        courseId,
      ]);
      if (!course) {
        throw notFound('Course not found');
      }

      // Module quizzes in module order, the final assessment last — the order
      // the builder screen lists them in.
      const rows = await query<QuizRow>(
        `${QUIZ_SELECT}
         LEFT JOIN modules m ON m.id = q.module_id
              WHERE q.course_id = $1
              ORDER BY (q.kind = 'final'), m.position NULLS FIRST, q.created_at`,
        [courseId],
      );

      return withQuestions(rows);
    },
  });

  app.post<{ Params: { courseId: string } }>('/admin/courses/:courseId/quizzes', {
    preHandler: app.requirePermission('quiz:manage'),
    handler: async (request, reply) => {
      const user = request.currentUser!;
      const courseId = requireId(request.params.courseId, 'Course not found');
      const input = quizCreateSchema.parse(request.body);

      const course = await queryOne<{ id: string; title: string; pass_mark_percent: number }>(
        `SELECT id, title, pass_mark_percent FROM courses WHERE id = $1`,
        [courseId],
      );
      if (!course) {
        throw notFound('Course not found');
      }

      if (input.kind === 'final' && input.moduleId) {
        throw new ApiError(
          'validation_failed',
          'A final assessment covers the whole course, so it cannot be attached to a module',
          { moduleId: 'Leave the module empty for a final assessment' },
        );
      }
      if (input.moduleId) {
        await assertModuleOnCourse(input.moduleId, course.id);
      }

      const quizId = await transaction(async (client) => {
        await ensureQuestionBank(client, course.id, course.title);

        let inserted;
        try {
          inserted = await client.query<{ id: string }>(
            `INSERT INTO quizzes (course_id, module_id, title, kind, pass_mark_percent,
                                  max_attempts, time_limit_minutes, question_count, randomise)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id`,
            [
              course.id,
              input.moduleId ?? null,
              input.title,
              input.kind,
              // An unset pass mark follows the course rather than the column
              // default, so raising a course's bar raises its quizzes' too.
              input.passMarkPercent ?? course.pass_mark_percent,
              input.maxAttempts ?? null,
              input.timeLimitMinutes ?? null,
              input.questionCount ?? null,
              input.randomise,
            ],
          );
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw DUPLICATE_FINAL;
          }
          throw error;
        }

        const id = inserted.rows[0]!.id;
        await recordAudit(
          {
            actorId: user.id,
            action: 'quiz.created',
            subjectType: 'quiz',
            subjectId: id,
            metadata: { courseId: course.id, kind: input.kind, title: input.title },
            ipAddress: request.ip,
          },
          client,
        );
        return id;
      });

      return reply.status(201).send(await loadQuiz(quizId));
    },
  });

  app.patch<{ Params: { quizId: string } }>('/admin/quizzes/:quizId', {
    preHandler: app.requirePermission('quiz:manage'),
    handler: async (request) => {
      const user = request.currentUser!;
      const quizId = requireId(request.params.quizId, 'Quiz not found');
      const patch = quizPatchSchema.parse(request.body);

      const existing = await queryOne<{
        id: string;
        course_id: string;
        module_id: string | null;
        kind: QuizKind;
      }>(`SELECT id, course_id, module_id, kind FROM quizzes WHERE id = $1`, [quizId]);
      if (!existing) {
        throw notFound('Quiz not found');
      }

      // The module/kind rule is checked against the merged result, so promoting
      // a module quiz to the final assessment cannot leave a stale module_id
      // pointing at one module of a course-wide test.
      const nextKind = patch.kind ?? existing.kind;
      const nextModuleId =
        patch.moduleId === undefined ? existing.module_id : patch.moduleId ?? null;

      if (nextKind === 'final' && nextModuleId) {
        throw new ApiError(
          'validation_failed',
          'A final assessment covers the whole course, so it cannot be attached to a module',
          { moduleId: 'Clear the module before making this the final assessment' },
        );
      }
      if (nextModuleId && nextModuleId !== existing.module_id) {
        await assertModuleOnCourse(nextModuleId, existing.course_id);
      }

      const assignments: string[] = [];
      const params: QueryParam[] = [];
      const set = (column: string, value: QueryParam) => {
        params.push(value);
        assignments.push(`${column} = $${params.length}`);
      };

      if (patch.title !== undefined) set('title', patch.title);
      if (patch.kind !== undefined) set('kind', patch.kind);
      if (patch.moduleId !== undefined) set('module_id', patch.moduleId ?? null);
      if (patch.passMarkPercent !== undefined) set('pass_mark_percent', patch.passMarkPercent);
      if (patch.maxAttempts !== undefined) set('max_attempts', patch.maxAttempts ?? null);
      if (patch.timeLimitMinutes !== undefined) {
        set('time_limit_minutes', patch.timeLimitMinutes ?? null);
      }
      if (patch.questionCount !== undefined) set('question_count', patch.questionCount ?? null);
      if (patch.randomise !== undefined) set('randomise', patch.randomise);

      if (assignments.length === 0) {
        return loadQuiz(quizId);
      }

      params.push(quizId);

      await transaction(async (client) => {
        try {
          await client.query(
            `UPDATE quizzes
                SET ${assignments.join(', ')}, updated_at = now()
              WHERE id = $${params.length}`,
            params,
          );
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw DUPLICATE_FINAL;
          }
          throw error;
        }

        await recordAudit(
          {
            actorId: user.id,
            action: 'quiz.updated',
            subjectType: 'quiz',
            subjectId: quizId,
            metadata: { courseId: existing.course_id, fields: Object.keys(patch) },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadQuiz(quizId);
    },
  });

  app.delete<{ Params: { quizId: string } }>('/admin/quizzes/:quizId', {
    preHandler: app.requirePermission('quiz:manage'),
    handler: async (request, reply) => {
      const user = request.currentUser!;
      const quizId = requireId(request.params.quizId, 'Quiz not found');

      // Deleting a quiz cascades to quiz_attempts, which would erase the scores
      // behind any certificate already issued off it. Refuse instead.
      const sat = await queryOne<{ id: string }>(
        `SELECT id FROM quiz_attempts
          WHERE quiz_id = $1 AND submitted_at IS NOT NULL
          LIMIT 1`,
        [quizId],
      );
      if (sat) {
        throw new ApiError(
          'conflict',
          'Learners have already sat this quiz, so it cannot be deleted. Edit its questions instead.',
        );
      }

      const deleted = await transaction(async (client) => {
        // quiz_questions goes with it via cascade; the questions themselves stay
        // in the course bank so they can be reused on another quiz.
        const result = await client.query<{ id: string; course_id: string; kind: QuizKind }>(
          `DELETE FROM quizzes WHERE id = $1 RETURNING id, course_id, kind`,
          [quizId],
        );
        const row = result.rows[0];
        if (!row) {
          return null;
        }

        await recordAudit(
          {
            actorId: user.id,
            action: 'quiz.deleted',
            subjectType: 'quiz',
            subjectId: row.id,
            metadata: { courseId: row.course_id, kind: row.kind },
            ipAddress: request.ip,
          },
          client,
        );
        return row;
      });

      if (!deleted) {
        throw notFound('Quiz not found');
      }

      return reply.status(204).send();
    },
  });

  app.post<{ Params: { quizId: string } }>('/admin/quizzes/:quizId/questions', {
    preHandler: app.requirePermission('quiz:manage'),
    handler: async (request, reply) => {
      const quizId = requireId(request.params.quizId, 'Quiz not found');

      const quiz = await queryOne<{ id: string; course_id: string; course_title: string }>(
        `SELECT q.id, q.course_id, c.title AS course_title
           FROM quizzes q
           JOIN courses c ON c.id = q.course_id
          WHERE q.id = $1`,
        [quizId],
      );
      if (!quiz) {
        throw notFound('Quiz not found');
      }

      const input = questionSchema.parse(request.body);

      await transaction(async (client) => {
        const bankId = await ensureQuestionBank(client, quiz.course_id, quiz.course_title);

        const bankPosition = await client.query<{ position: number }>(
          `SELECT coalesce(max(position), -1) + 1 AS position FROM questions WHERE bank_id = $1`,
          [bankId],
        );

        const created = await client.query<{ id: string }>(
          `INSERT INTO questions (bank_id, type, prompt, feedback, position)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [bankId, input.type, input.prompt, input.feedback, bankPosition.rows[0]!.position],
        );
        const questionId = created.rows[0]!.id;

        await insertOptions(client, questionId, input.options);

        await client.query(
          `INSERT INTO quiz_questions (quiz_id, question_id, position)
           SELECT $1, $2, coalesce(max(position), -1) + 1
             FROM quiz_questions
            WHERE quiz_id = $1`,
          [quizId, questionId],
        );
      });

      return reply.status(201).send(await loadQuiz(quizId));
    },
  });

  app.patch<{ Params: { questionId: string } }>('/admin/questions/:questionId', {
    preHandler: app.requirePermission('quiz:manage'),
    handler: async (request) => {
      const questionId = requireId(request.params.questionId, 'Question not found');

      // The response is the quiz this question sits on. Every question created
      // through this API is linked to one, so a bank row with no link is not
      // something this endpoint can answer with.
      const existing = await queryOne<{
        id: string;
        type: QuestionType;
        prompt: string;
        feedback: string;
        quiz_id: string | null;
      }>(
        `SELECT ques.id, ques.type, ques.prompt, ques.feedback,
                (SELECT qq.quiz_id
                   FROM quiz_questions qq
                   JOIN quizzes qz ON qz.id = qq.quiz_id
                  WHERE qq.question_id = ques.id
                  ORDER BY qz.created_at
                  LIMIT 1) AS quiz_id
           FROM questions ques
          WHERE ques.id = $1`,
        [questionId],
      );
      if (!existing?.quiz_id) {
        throw notFound('Question not found');
      }

      const patch = questionPatchSchema.parse(request.body);

      const currentOptions =
        patch.options ??
        (
          await query<{ label: string; is_correct: boolean; match_key: string | null }>(
            `SELECT label, is_correct, match_key
               FROM question_options
              WHERE question_id = $1
              ORDER BY position`,
            [questionId],
          )
        ).map((row) => ({
          label: row.label,
          isCorrect: row.is_correct,
          matchKey: row.match_key,
        }));

      const merged = questionSchema.parse({
        type: patch.type ?? existing.type,
        prompt: patch.prompt ?? existing.prompt,
        feedback: patch.feedback ?? existing.feedback,
        options: currentOptions,
      });

      await transaction(async (client) => {
        await client.query(
          `UPDATE questions SET type = $2, prompt = $3, feedback = $4 WHERE id = $1`,
          [questionId, merged.type, merged.prompt, merged.feedback],
        );

        // Options are replaced wholesale rather than diffed: the answer key and
        // the option order are only meaningful as the set that was validated
        // together just now.
        await client.query(`DELETE FROM question_options WHERE question_id = $1`, [questionId]);
        await insertOptions(client, questionId, merged.options);
      });

      return loadQuiz(existing.quiz_id);
    },
  });

  app.delete<{ Params: { questionId: string } }>('/admin/questions/:questionId', {
    preHandler: app.requirePermission('quiz:manage'),
    handler: async (request, reply) => {
      const questionId = requireId(request.params.questionId, 'Question not found');

      // quiz_questions and question_options both cascade off this row, so the
      // question leaves every quiz it was on.
      const deleted = await queryOne<{ id: string }>(
        `DELETE FROM questions WHERE id = $1 RETURNING id`,
        [questionId],
      );
      if (!deleted) {
        throw notFound('Question not found');
      }

      return reply.status(204).send();
    },
  });
}
