import type { FastifyInstance } from 'fastify';
import type { PoolClient } from 'pg';
import { z } from 'zod';
import type {
  AdminContentBlock,
  AdminCourseDetail,
  AdminCourseSummary,
  AdminEnrolledLearner,
  AdminLesson,
  AdminModule,
  CourseStatus,
  PriceType,
} from '@kadsamhsa/domain';
import { ApiError, notFound } from '@kadsamhsa/domain';
import { recordAudit } from '../../audit.js';
import { query, queryOne, transaction } from '../../db/pool.js';

type ContentBlockType = AdminContentBlock['type'];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * A malformed id can never match a row, and handing it to Postgres turns what
 * should be a 404 into a 500 ("invalid input syntax for type uuid").
 */
function requireUuid(value: string, label: string): string {
  if (!UUID_PATTERN.test(value)) {
    throw notFound(`${label} not found`);
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* Request validation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Block URLs are rendered straight into `src`/`href` by the learner player, so
 * an unconstrained string here would be a stored XSS vector. Only http(s) and
 * site-relative paths (uploads served by this platform) are accepted.
 */
const assetUrlSchema = z
  .string()
  .trim()
  .min(1, 'Enter a URL')
  .max(2048)
  .refine((value) => {
    if (value.startsWith('/') && !value.startsWith('//')) {
      return true;
    }
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Enter an http(s) URL');

const uuidSchema = z.string().uuid('Enter a valid id');

const richTextPayloadSchema = z.object({
  html: z.string().max(500_000),
});

const videoPayloadSchema = z.object({
  url: assetUrlSchema,
  provider: z.string().trim().min(1).max(40).optional(),
});

const filePayloadSchema = z.object({
  url: assetUrlSchema,
  filename: z.string().trim().min(1).max(255).optional(),
});

const quizPayloadSchema = z.object({
  quizId: uuidSchema,
});

/**
 * The `type` column carries a CHECK constraint listing exactly these eight
 * values, and each one implies a different payload shape. Discriminating here
 * means an unknown type is a 422 rather than a constraint violation surfacing
 * as a 500, and a `video` block can never be saved without a URL.
 */
const blockContentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('rich_text'), payload: richTextPayloadSchema }),
  z.object({ type: z.literal('video'), payload: videoPayloadSchema }),
  z.object({ type: z.literal('audio'), payload: filePayloadSchema }),
  z.object({ type: z.literal('image'), payload: filePayloadSchema }),
  z.object({ type: z.literal('pdf'), payload: filePayloadSchema }),
  z.object({ type: z.literal('slides'), payload: filePayloadSchema }),
  z.object({ type: z.literal('download'), payload: filePayloadSchema }),
  z.object({ type: z.literal('quiz'), payload: quizPayloadSchema }),
]);

const titleSchema = z.string().trim().min(2, 'Enter a title').max(200);
const positionSchema = z.number().int().min(0).max(10_000);
const durationSchema = z.number().int().min(0).max(100_000).nullable();

const createCourseSchema = z.object({
  title: titleSchema,
  summary: z.string().trim().max(500).optional(),
});

const updateCourseSchema = z
  .object({
    title: titleSchema,
    summary: z.string().trim().max(500),
    description: z.string().max(100_000),
    objectives: z.array(z.string().trim().min(1).max(300)).max(30),
    coverImageUrl: assetUrlSchema.nullable(),
    categoryId: uuidSchema.nullable(),
    priceType: z.enum(['free', 'paid']),
    // Minor units (kobo). Integer only — floats do not survive a round trip
    // through a currency and must never reach the ledger.
    priceAmount: z.number().int().min(0).max(2_000_000_000).nullable(),
    currency: z.string().trim().toUpperCase().length(3),
    durationMinutes: durationSchema,
    passMarkPercent: z.number().int().min(1).max(100),
    certificateEnabled: z.boolean(),
    isFeatured: z.boolean(),
  })
  .partial();

const courseStatusSchema = z.object({
  status: z.enum(['draft', 'published', 'archived']),
});

const createModuleSchema = z.object({ title: titleSchema });

const updateModuleSchema = z
  .object({ title: titleSchema, position: positionSchema })
  .partial();

const createLessonSchema = z.object({
  title: titleSchema,
  durationMinutes: durationSchema.optional(),
  isRequired: z.boolean().optional(),
});

const updateLessonSchema = z
  .object({
    title: titleSchema,
    position: positionSchema,
    durationMinutes: durationSchema,
    isRequired: z.boolean(),
  })
  .partial();

const updateBlockSchema = z.object({
  // Left unknown on purpose: the payload rules depend on the block's stored
  // type, so it is validated below once that type has been read.
  payload: z.unknown().optional(),
  position: positionSchema.optional(),
});

/* -------------------------------------------------------------------------- */
/* Row shapes and mapping                                                      */
/* -------------------------------------------------------------------------- */

interface CourseSummaryRow {
  id: string;
  slug: string;
  title: string;
  status: CourseStatus;
  price_type: PriceType;
  price_amount: number | null;
  currency: string;
  is_featured: boolean;
  module_count: string;
  lesson_count: string;
  enrolment_count: string;
  published_at: Date | null;
  updated_at: Date;
}

interface CourseDetailRow extends CourseSummaryRow {
  summary: string;
  description: string;
  objectives: unknown;
  cover_image_url: string | null;
  category_id: string | null;
  duration_minutes: number | null;
  pass_mark_percent: number;
  certificate_enabled: boolean;
}

interface ModuleRow {
  id: string;
  title: string;
  position: number;
  quiz_id: string | null;
}

interface LessonRow {
  id: string;
  module_id: string;
  title: string;
  position: number;
  duration_minutes: number | null;
  is_required: boolean;
}

interface BlockRow {
  id: string;
  lesson_id: string;
  type: ContentBlockType;
  position: number;
  payload: unknown;
}

const COUNT_COLUMNS = `
  (SELECT count(*) FROM modules m WHERE m.course_id = c.id) AS module_count,
  (SELECT count(*) FROM lessons l
     JOIN modules m ON m.id = l.module_id
    WHERE m.course_id = c.id) AS lesson_count,
  (SELECT count(*) FROM enrolments e
    WHERE e.course_id = c.id AND e.status <> 'cancelled') AS enrolment_count
`;

function toSummary(row: CourseSummaryRow): AdminCourseSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    status: row.status,
    priceType: row.price_type,
    priceAmount: row.price_amount,
    currency: row.currency,
    isFeatured: row.is_featured,
    moduleCount: Number(row.module_count),
    lessonCount: Number(row.lesson_count),
    enrolmentCount: Number(row.enrolment_count),
    publishedAt: row.published_at?.toISOString() ?? null,
    updatedAt: row.updated_at.toISOString(),
  };
}

function toPayload(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * The one read path for every endpoint that answers with an AdminCourseDetail.
 * Four flat queries assembled in memory rather than a join per level: the tree
 * is small, and this keeps a course with many lessons from fanning out into a
 * row per block.
 */
async function loadCourseDetail(courseId: string): Promise<AdminCourseDetail> {
  const course = await queryOne<CourseDetailRow>(
    `SELECT c.id, c.slug, c.title, c.summary, c.description, c.objectives,
            c.cover_image_url, c.category_id, c.status, c.price_type, c.price_amount,
            c.currency, c.duration_minutes, c.pass_mark_percent, c.certificate_enabled,
            c.is_featured, c.published_at, c.updated_at,
            ${COUNT_COLUMNS}
       FROM courses c
      WHERE c.id = $1`,
    [courseId],
  );

  if (!course) {
    throw notFound('Course not found');
  }

  const moduleRows = await query<ModuleRow>(
    `SELECT m.id, m.title, m.position,
            (SELECT q.id FROM quizzes q
              WHERE q.module_id = m.id
              ORDER BY q.created_at
              LIMIT 1) AS quiz_id
       FROM modules m
      WHERE m.course_id = $1
      ORDER BY m.position, m.created_at`,
    [courseId],
  );

  const lessonRows = await query<LessonRow>(
    `SELECT l.id, l.module_id, l.title, l.position, l.duration_minutes, l.is_required
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
      WHERE m.course_id = $1
      ORDER BY l.position, l.created_at`,
    [courseId],
  );

  const blockRows = await query<BlockRow>(
    `SELECT b.id, b.lesson_id, b.type, b.position, b.payload
       FROM content_blocks b
       JOIN lessons l ON l.id = b.lesson_id
       JOIN modules m ON m.id = l.module_id
      WHERE m.course_id = $1
      ORDER BY b.position, b.created_at`,
    [courseId],
  );

  const blocksByLesson = new Map<string, AdminContentBlock[]>();
  for (const row of blockRows) {
    const list = blocksByLesson.get(row.lesson_id) ?? [];
    list.push({
      id: row.id,
      type: row.type,
      position: row.position,
      payload: toPayload(row.payload),
    });
    blocksByLesson.set(row.lesson_id, list);
  }

  const lessonsByModule = new Map<string, AdminLesson[]>();
  for (const row of lessonRows) {
    const list = lessonsByModule.get(row.module_id) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      position: row.position,
      durationMinutes: row.duration_minutes,
      isRequired: row.is_required,
      blocks: blocksByLesson.get(row.id) ?? [],
    });
    lessonsByModule.set(row.module_id, list);
  }

  const modules: AdminModule[] = moduleRows.map((row) => ({
    id: row.id,
    title: row.title,
    position: row.position,
    lessons: lessonsByModule.get(row.id) ?? [],
    quizId: row.quiz_id,
  }));

  return {
    ...toSummary(course),
    summary: course.summary,
    description: course.description,
    objectives: Array.isArray(course.objectives) ? (course.objectives as string[]) : [],
    coverImageUrl: course.cover_image_url,
    categoryId: course.category_id,
    passMarkPercent: course.pass_mark_percent,
    certificateEnabled: course.certificate_enabled,
    durationMinutes: course.duration_minutes,
    modules,
  };
}

/* -------------------------------------------------------------------------- */
/* Slugs and ordering                                                          */
/* -------------------------------------------------------------------------- */

function slugify(title: string): string {
  const base = title
    // Decompose then strip combining marks, so "Ọ̀ṣun" slugs as "osun" rather
    // than losing the whole word to the ASCII filter below.
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return base || 'course';
}

/**
 * Two courses called "Mental Health First Aid" are entirely normal, so the slug
 * has to disambiguate rather than fail. Candidates are checked in one round
 * trip; the unique index on `courses.slug` remains the real guarantee if two
 * admins save the same title at the same instant.
 */
async function uniqueSlug(title: string, excludeCourseId: string | null): Promise<string> {
  const base = slugify(title);
  const rows = await query<{ slug: string }>(
    `SELECT slug FROM courses
      WHERE (slug = $1 OR slug LIKE $2)
        AND ($3::uuid IS NULL OR id <> $3::uuid)`,
    [base, `${base}-%`, excludeCourseId],
  );

  const taken = new Set(rows.map((row) => row.slug));
  if (!taken.has(base)) {
    return base;
  }
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
  return `${base}-${Date.now()}`;
}

type OrderedTable = 'modules' | 'lessons' | 'content_blocks';
type ParentColumn = 'course_id' | 'module_id' | 'lesson_id';

/**
 * Rewrites a sibling group to a dense 0..n-1 sequence. `movedId` breaks ties in
 * favour of the row the admin just dragged, so requesting position 2 puts it at
 * index 2 and pushes the previous occupant down instead of leaving two rows
 * sharing a position. Passing null (after a delete) simply closes the gap.
 *
 * The table and column names come from the unions above, never from a request,
 * so interpolating them cannot inject.
 */
async function resequence(
  client: PoolClient,
  table: OrderedTable,
  parentColumn: ParentColumn,
  parentId: string,
  movedId: string | null,
): Promise<void> {
  await client.query(
    `WITH ordered AS (
       SELECT id,
              (row_number() OVER (
                ORDER BY position,
                         CASE WHEN id = $2 THEN 0 ELSE 1 END,
                         created_at
              ) - 1)::int AS pos
         FROM ${table}
        WHERE ${parentColumn} = $1
     )
     UPDATE ${table} t
        SET position = ordered.pos
       FROM ordered
      WHERE ordered.id = t.id AND t.position <> ordered.pos`,
    [parentId, movedId],
  );
}

/** Any change to the tree is a change to the course the admin list sorts by. */
async function touchCourse(client: PoolClient, courseId: string): Promise<void> {
  await client.query(`UPDATE courses SET updated_at = now() WHERE id = $1`, [courseId]);
}

async function resolveModule(moduleId: string): Promise<{ id: string; courseId: string }> {
  const row = await queryOne<{ id: string; course_id: string }>(
    `SELECT id, course_id FROM modules WHERE id = $1`,
    [requireUuid(moduleId, 'Module')],
  );
  if (!row) {
    throw notFound('Module not found');
  }
  return { id: row.id, courseId: row.course_id };
}

async function resolveLesson(
  lessonId: string,
): Promise<{ id: string; moduleId: string; courseId: string }> {
  const row = await queryOne<{ id: string; module_id: string; course_id: string }>(
    `SELECT l.id, l.module_id, m.course_id
       FROM lessons l
       JOIN modules m ON m.id = l.module_id
      WHERE l.id = $1`,
    [requireUuid(lessonId, 'Lesson')],
  );
  if (!row) {
    throw notFound('Lesson not found');
  }
  return { id: row.id, moduleId: row.module_id, courseId: row.course_id };
}

async function resolveBlock(
  blockId: string,
): Promise<{ id: string; lessonId: string; courseId: string; type: ContentBlockType }> {
  const row = await queryOne<{
    id: string;
    lesson_id: string;
    course_id: string;
    type: ContentBlockType;
  }>(
    `SELECT b.id, b.lesson_id, b.type, m.course_id
       FROM content_blocks b
       JOIN lessons l ON l.id = b.lesson_id
       JOIN modules m ON m.id = l.module_id
      WHERE b.id = $1`,
    [requireUuid(blockId, 'Block')],
  );
  if (!row) {
    throw notFound('Block not found');
  }
  return { id: row.id, lessonId: row.lesson_id, courseId: row.course_id, type: row.type };
}

/**
 * A quiz block pointing at another course's quiz would render an assessment the
 * learner is not enrolled for, so the reference is checked rather than trusted.
 */
async function assertQuizBelongsToCourse(quizId: string, courseId: string): Promise<void> {
  const quiz = await queryOne<{ id: string }>(
    `SELECT id FROM quizzes WHERE id = $1 AND course_id = $2`,
    [quizId, courseId],
  );
  if (!quiz) {
    throw new ApiError('validation_failed', 'That quiz does not belong to this course', {
      quizId: 'Choose a quiz from this course',
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Gurucan-style course builder (PRD A1, A2, A6).
 *
 * Every route is permission-checked, never merely authenticated: `course:update`
 * for reading and editing the tree, `course:create` to add a course,
 * `course:publish` to change its status, and `user:read` for the learner roster.
 */
export async function adminCourseRoutes(app: FastifyInstance) {
  app.get('/admin/courses', {
    preHandler: app.requirePermission('course:update'),
    handler: async (): Promise<AdminCourseSummary[]> => {
      const rows = await query<CourseSummaryRow>(
        `SELECT c.id, c.slug, c.title, c.status, c.price_type, c.price_amount, c.currency,
                c.is_featured, c.published_at, c.updated_at,
                ${COUNT_COLUMNS}
           FROM courses c
          ORDER BY c.updated_at DESC`,
      );
      return rows.map(toSummary);
    },
  });

  app.post('/admin/courses', {
    preHandler: app.requirePermission('course:create'),
    handler: async (request, reply) => {
      const user = request.currentUser!;
      const input = createCourseSchema.parse(request.body);
      const slug = await uniqueSlug(input.title, null);

      const courseId = await transaction(async (client) => {
        const result = await client.query<{ id: string }>(
          `INSERT INTO courses (slug, title, summary, status)
           VALUES ($1, $2, $3, 'draft')
           RETURNING id`,
          [slug, input.title, input.summary ?? ''],
        );
        const id = result.rows[0]!.id;
        await recordAudit(
          {
            actorId: user.id,
            action: 'course.created',
            subjectType: 'course',
            subjectId: id,
            metadata: { title: input.title, slug },
            ipAddress: request.ip,
          },
          client,
        );
        return id;
      });

      return reply.status(201).send(await loadCourseDetail(courseId));
    },
  });

  app.get<{ Params: { courseId: string } }>('/admin/courses/:courseId', {
    preHandler: app.requirePermission('course:update'),
    handler: async (request): Promise<AdminCourseDetail> =>
      loadCourseDetail(requireUuid(request.params.courseId, 'Course')),
  });

  app.patch<{ Params: { courseId: string } }>('/admin/courses/:courseId', {
    preHandler: app.requirePermission('course:update'),
    handler: async (request): Promise<AdminCourseDetail> => {
      const user = request.currentUser!;
      const courseId = requireUuid(request.params.courseId, 'Course');
      const input = updateCourseSchema.parse(request.body);

      const current = await queryOne<{
        id: string;
        status: CourseStatus;
        title: string;
        price_type: PriceType;
        price_amount: number | null;
      }>(`SELECT id, status, title, price_type, price_amount FROM courses WHERE id = $1`, [
        courseId,
      ]);
      if (!current) {
        throw notFound('Course not found');
      }

      // The schema rejects a paid course with no price, but the constraint
      // violation would surface as a 500. Decide it here against the merged
      // state so the admin gets a field-level message instead.
      const nextPriceType = input.priceType ?? current.price_type;
      const nextPriceAmount =
        input.priceAmount !== undefined ? input.priceAmount : current.price_amount;
      if (nextPriceType === 'paid' && (nextPriceAmount === null || nextPriceAmount <= 0)) {
        throw new ApiError('validation_failed', 'A paid course needs a price', {
          priceAmount: 'Enter a price in kobo',
        });
      }

      if (input.categoryId) {
        const category = await queryOne<{ id: string }>(
          `SELECT id FROM course_categories WHERE id = $1`,
          [input.categoryId],
        );
        if (!category) {
          throw new ApiError('validation_failed', 'Unknown category', {
            categoryId: 'Choose a category from the list',
          });
        }
      }

      const assignments: string[] = [];
      const params: (string | number | boolean | null)[] = [];
      const assign = (column: string, value: string | number | boolean | null, cast = '') => {
        params.push(value);
        assignments.push(`${column} = $${params.length}${cast}`);
      };

      if (input.title !== undefined) {
        assign('title', input.title);
        // A published slug is a live URL and may already be in a certificate,
        // an email or a partner's link, so retitling only re-slugs a draft.
        if (current.status === 'draft' && input.title !== current.title) {
          assign('slug', await uniqueSlug(input.title, courseId));
        }
      }
      if (input.summary !== undefined) assign('summary', input.summary);
      if (input.description !== undefined) assign('description', input.description);
      if (input.objectives !== undefined) {
        assign('objectives', JSON.stringify(input.objectives), '::jsonb');
      }
      if (input.coverImageUrl !== undefined) assign('cover_image_url', input.coverImageUrl);
      if (input.categoryId !== undefined) assign('category_id', input.categoryId, '::uuid');
      if (input.priceType !== undefined) assign('price_type', input.priceType);
      if (input.priceAmount !== undefined) assign('price_amount', input.priceAmount);
      if (input.currency !== undefined) assign('currency', input.currency);
      if (input.durationMinutes !== undefined) assign('duration_minutes', input.durationMinutes);
      if (input.passMarkPercent !== undefined) assign('pass_mark_percent', input.passMarkPercent);
      if (input.certificateEnabled !== undefined) {
        assign('certificate_enabled', input.certificateEnabled);
      }
      if (input.isFeatured !== undefined) assign('is_featured', input.isFeatured);

      if (assignments.length === 0) {
        return loadCourseDetail(courseId);
      }

      await transaction(async (client) => {
        params.push(courseId);
        await client.query(
          `UPDATE courses
              SET ${assignments.join(', ')}, updated_at = now()
            WHERE id = $${params.length}`,
          params,
        );
        await recordAudit(
          {
            actorId: user.id,
            action: 'course.updated',
            subjectType: 'course',
            subjectId: courseId,
            metadata: { fields: Object.keys(input) },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadCourseDetail(courseId);
    },
  });

  app.patch<{ Params: { courseId: string } }>('/admin/courses/:courseId/status', {
    preHandler: app.requirePermission('course:publish'),
    handler: async (request): Promise<AdminCourseDetail> => {
      const user = request.currentUser!;
      const courseId = requireUuid(request.params.courseId, 'Course');
      const { status } = courseStatusSchema.parse(request.body);

      const current = await queryOne<{ id: string; status: CourseStatus; lesson_count: string }>(
        `SELECT c.id, c.status,
                (SELECT count(*) FROM lessons l
                   JOIN modules m ON m.id = l.module_id
                  WHERE m.course_id = c.id) AS lesson_count
           FROM courses c
          WHERE c.id = $1`,
        [courseId],
      );
      if (!current) {
        throw notFound('Course not found');
      }

      // Publishing an empty shell is the most common way a non-technical admin
      // ships something broken: it appears in the catalogue, learners enrol, and
      // there is nothing to open. Refuse it at the boundary.
      if (status === 'published' && Number(current.lesson_count) === 0) {
        throw new ApiError(
          'validation_failed',
          'Add at least one lesson before publishing this course',
          { status: 'This course has no lessons yet' },
        );
      }

      await transaction(async (client) => {
        await client.query(
          `UPDATE courses
              SET status = $2,
                  -- COALESCE, not now(): re-publishing after an archive keeps the
                  -- original date the catalogue orders by.
                  published_at = CASE
                                   WHEN $2 = 'published' THEN COALESCE(published_at, now())
                                   ELSE published_at
                                 END,
                  updated_at = now()
            WHERE id = $1`,
          [courseId, status],
        );
        await recordAudit(
          {
            actorId: user.id,
            action: status === 'published' ? 'course.published' : 'course.updated',
            subjectType: 'course',
            subjectId: courseId,
            metadata: { from: current.status, to: status },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadCourseDetail(courseId);
    },
  });

  /* ---------------------------------------------------------------------- */
  /* Modules                                                                 */
  /* ---------------------------------------------------------------------- */

  app.post<{ Params: { courseId: string } }>('/admin/courses/:courseId/modules', {
    preHandler: app.requirePermission('course:update'),
    handler: async (request, reply) => {
      const user = request.currentUser!;
      const courseId = requireUuid(request.params.courseId, 'Course');
      const input = createModuleSchema.parse(request.body);

      const course = await queryOne<{ id: string }>(`SELECT id FROM courses WHERE id = $1`, [
        courseId,
      ]);
      if (!course) {
        throw notFound('Course not found');
      }

      await transaction(async (client) => {
        const result = await client.query<{ id: string }>(
          `INSERT INTO modules (course_id, title, position)
           VALUES ($1, $2,
                   (SELECT COALESCE(max(position) + 1, 0) FROM modules WHERE course_id = $1))
           RETURNING id`,
          [courseId, input.title],
        );
        await touchCourse(client, courseId);
        await recordAudit(
          {
            actorId: user.id,
            action: 'course.updated',
            subjectType: 'course',
            subjectId: courseId,
            metadata: { added: 'module', moduleId: result.rows[0]!.id, title: input.title },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return reply.status(201).send(await loadCourseDetail(courseId));
    },
  });

  app.patch<{ Params: { moduleId: string } }>('/admin/modules/:moduleId', {
    preHandler: app.requirePermission('course:update'),
    handler: async (request): Promise<AdminCourseDetail> => {
      const user = request.currentUser!;
      const target = await resolveModule(request.params.moduleId);
      const input = updateModuleSchema.parse(request.body);

      if (input.title === undefined && input.position === undefined) {
        return loadCourseDetail(target.courseId);
      }

      await transaction(async (client) => {
        if (input.title !== undefined) {
          await client.query(`UPDATE modules SET title = $2 WHERE id = $1`, [
            target.id,
            input.title,
          ]);
        }
        if (input.position !== undefined) {
          await client.query(`UPDATE modules SET position = $2 WHERE id = $1`, [
            target.id,
            input.position,
          ]);
          await resequence(client, 'modules', 'course_id', target.courseId, target.id);
        }
        await touchCourse(client, target.courseId);
        await recordAudit(
          {
            actorId: user.id,
            action: 'course.updated',
            subjectType: 'course',
            subjectId: target.courseId,
            metadata: { updated: 'module', moduleId: target.id, fields: Object.keys(input) },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadCourseDetail(target.courseId);
    },
  });

  app.delete<{ Params: { moduleId: string } }>('/admin/modules/:moduleId', {
    preHandler: app.requirePermission('course:update'),
    handler: async (request): Promise<AdminCourseDetail> => {
      const user = request.currentUser!;
      const target = await resolveModule(request.params.moduleId);

      await transaction(async (client) => {
        // Lessons, blocks and any module quiz go with it via ON DELETE CASCADE.
        await client.query(`DELETE FROM modules WHERE id = $1`, [target.id]);
        await resequence(client, 'modules', 'course_id', target.courseId, null);
        await touchCourse(client, target.courseId);
        await recordAudit(
          {
            actorId: user.id,
            action: 'course.deleted',
            subjectType: 'course',
            subjectId: target.courseId,
            metadata: { deleted: 'module', moduleId: target.id },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadCourseDetail(target.courseId);
    },
  });

  /* ---------------------------------------------------------------------- */
  /* Lessons                                                                 */
  /* ---------------------------------------------------------------------- */

  app.post<{ Params: { moduleId: string } }>('/admin/modules/:moduleId/lessons', {
    preHandler: app.requirePermission('course:update'),
    handler: async (request, reply) => {
      const user = request.currentUser!;
      const target = await resolveModule(request.params.moduleId);
      const input = createLessonSchema.parse(request.body);

      await transaction(async (client) => {
        const result = await client.query<{ id: string }>(
          `INSERT INTO lessons (module_id, title, position, duration_minutes, is_required)
           VALUES ($1, $2,
                   (SELECT COALESCE(max(position) + 1, 0) FROM lessons WHERE module_id = $1),
                   $3, $4)
           RETURNING id`,
          [target.id, input.title, input.durationMinutes ?? null, input.isRequired ?? true],
        );
        await touchCourse(client, target.courseId);
        await recordAudit(
          {
            actorId: user.id,
            action: 'course.updated',
            subjectType: 'course',
            subjectId: target.courseId,
            metadata: {
              added: 'lesson',
              moduleId: target.id,
              lessonId: result.rows[0]!.id,
              title: input.title,
            },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return reply.status(201).send(await loadCourseDetail(target.courseId));
    },
  });

  app.patch<{ Params: { lessonId: string } }>('/admin/lessons/:lessonId', {
    preHandler: app.requirePermission('course:update'),
    handler: async (request): Promise<AdminCourseDetail> => {
      const user = request.currentUser!;
      const target = await resolveLesson(request.params.lessonId);
      const input = updateLessonSchema.parse(request.body);

      const assignments: string[] = [];
      const params: (string | number | boolean | null)[] = [target.id];
      const assign = (column: string, value: string | number | boolean | null) => {
        params.push(value);
        assignments.push(`${column} = $${params.length}`);
      };

      if (input.title !== undefined) assign('title', input.title);
      if (input.position !== undefined) assign('position', input.position);
      if (input.durationMinutes !== undefined) assign('duration_minutes', input.durationMinutes);
      if (input.isRequired !== undefined) assign('is_required', input.isRequired);

      if (assignments.length === 0) {
        return loadCourseDetail(target.courseId);
      }

      await transaction(async (client) => {
        await client.query(
          `UPDATE lessons SET ${assignments.join(', ')} WHERE id = $1`,
          params,
        );
        if (input.position !== undefined) {
          await resequence(client, 'lessons', 'module_id', target.moduleId, target.id);
        }
        await touchCourse(client, target.courseId);
        await recordAudit(
          {
            actorId: user.id,
            action: 'course.updated',
            subjectType: 'course',
            subjectId: target.courseId,
            metadata: { updated: 'lesson', lessonId: target.id, fields: Object.keys(input) },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadCourseDetail(target.courseId);
    },
  });

  app.delete<{ Params: { lessonId: string } }>('/admin/lessons/:lessonId', {
    preHandler: app.requirePermission('course:update'),
    handler: async (request): Promise<AdminCourseDetail> => {
      const user = request.currentUser!;
      const target = await resolveLesson(request.params.lessonId);

      await transaction(async (client) => {
        // Content blocks and lesson_progress cascade from the lesson row.
        await client.query(`DELETE FROM lessons WHERE id = $1`, [target.id]);
        await resequence(client, 'lessons', 'module_id', target.moduleId, null);
        await touchCourse(client, target.courseId);
        await recordAudit(
          {
            actorId: user.id,
            action: 'course.deleted',
            subjectType: 'course',
            subjectId: target.courseId,
            metadata: { deleted: 'lesson', lessonId: target.id, moduleId: target.moduleId },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadCourseDetail(target.courseId);
    },
  });

  /* ---------------------------------------------------------------------- */
  /* Content blocks                                                          */
  /* ---------------------------------------------------------------------- */

  app.post<{ Params: { lessonId: string } }>('/admin/lessons/:lessonId/blocks', {
    preHandler: app.requirePermission('course:update'),
    handler: async (request, reply) => {
      const user = request.currentUser!;
      const target = await resolveLesson(request.params.lessonId);
      const input = blockContentSchema.parse(request.body);

      if (input.type === 'quiz') {
        await assertQuizBelongsToCourse(input.payload.quizId, target.courseId);
      }

      await transaction(async (client) => {
        const result = await client.query<{ id: string }>(
          `INSERT INTO content_blocks (lesson_id, type, position, payload)
           VALUES ($1, $2,
                   (SELECT COALESCE(max(position) + 1, 0)
                      FROM content_blocks WHERE lesson_id = $1),
                   $3::jsonb)
           RETURNING id`,
          [target.id, input.type, JSON.stringify(input.payload)],
        );
        await touchCourse(client, target.courseId);
        await recordAudit(
          {
            actorId: user.id,
            action: 'course.updated',
            subjectType: 'course',
            subjectId: target.courseId,
            metadata: {
              added: 'block',
              lessonId: target.id,
              blockId: result.rows[0]!.id,
              type: input.type,
            },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return reply.status(201).send(await loadCourseDetail(target.courseId));
    },
  });

  app.patch<{ Params: { blockId: string } }>('/admin/blocks/:blockId', {
    preHandler: app.requirePermission('course:update'),
    handler: async (request): Promise<AdminCourseDetail> => {
      const user = request.currentUser!;
      const target = await resolveBlock(request.params.blockId);
      const input = updateBlockSchema.parse(request.body);

      if (input.payload === undefined && input.position === undefined) {
        return loadCourseDetail(target.courseId);
      }

      // A block's type is fixed once created, so the payload is validated
      // against the stored type through the same union the create path uses.
      let payloadJson: string | null = null;
      if (input.payload !== undefined) {
        const parsed = blockContentSchema.parse({ type: target.type, payload: input.payload });
        if (parsed.type === 'quiz') {
          await assertQuizBelongsToCourse(parsed.payload.quizId, target.courseId);
        }
        payloadJson = JSON.stringify(parsed.payload);
      }

      await transaction(async (client) => {
        if (payloadJson !== null) {
          await client.query(`UPDATE content_blocks SET payload = $2::jsonb WHERE id = $1`, [
            target.id,
            payloadJson,
          ]);
        }
        if (input.position !== undefined) {
          await client.query(`UPDATE content_blocks SET position = $2 WHERE id = $1`, [
            target.id,
            input.position,
          ]);
          await resequence(client, 'content_blocks', 'lesson_id', target.lessonId, target.id);
        }
        await touchCourse(client, target.courseId);
        await recordAudit(
          {
            actorId: user.id,
            action: 'course.updated',
            subjectType: 'course',
            subjectId: target.courseId,
            metadata: { updated: 'block', blockId: target.id, fields: Object.keys(input) },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return loadCourseDetail(target.courseId);
    },
  });

  app.delete<{ Params: { blockId: string } }>('/admin/blocks/:blockId', {
    preHandler: app.requirePermission('course:update'),
    handler: async (request, reply) => {
      const user = request.currentUser!;
      const target = await resolveBlock(request.params.blockId);

      await transaction(async (client) => {
        await client.query(`DELETE FROM content_blocks WHERE id = $1`, [target.id]);
        await resequence(client, 'content_blocks', 'lesson_id', target.lessonId, null);
        await touchCourse(client, target.courseId);
        await recordAudit(
          {
            actorId: user.id,
            action: 'course.deleted',
            subjectType: 'course',
            subjectId: target.courseId,
            metadata: { deleted: 'block', blockId: target.id, lessonId: target.lessonId },
            ipAddress: request.ip,
          },
          client,
        );
      });

      return reply.status(204).send();
    },
  });

  /* ---------------------------------------------------------------------- */
  /* Learner roster (PRD A6)                                                 */
  /* ---------------------------------------------------------------------- */

  app.get<{ Params: { courseId: string } }>('/admin/courses/:courseId/learners', {
    preHandler: app.requirePermission('user:read'),
    handler: async (request): Promise<AdminEnrolledLearner[]> => {
      const courseId = requireUuid(request.params.courseId, 'Course');

      const course = await queryOne<{ id: string }>(`SELECT id FROM courses WHERE id = $1`, [
        courseId,
      ]);
      if (!course) {
        throw notFound('Course not found');
      }

      // Progress, best final score and certificate all come back as correlated
      // subqueries on one pass: a roster of 500 learners must not become 1,500
      // round trips.
      const rows = await query<{
        enrolment_id: string;
        user_id: string;
        full_name: string;
        email: string;
        status: 'active' | 'completed' | 'cancelled';
        enrolled_at: Date;
        completed_at: Date | null;
        lessons_total: string;
        lessons_completed: string;
        final_score_percent: number | null;
        certificate_verification_id: string | null;
      }>(
        `SELECT e.id AS enrolment_id, u.id AS user_id, u.full_name, u.email,
                e.status, e.enrolled_at, e.completed_at,
                (SELECT count(*) FROM lessons l
                   JOIN modules m ON m.id = l.module_id
                  WHERE m.course_id = e.course_id AND l.is_required) AS lessons_total,
                -- Required lessons only, so the count shares a denominator with
                -- lessons_total and the percentage can never exceed 100.
                (SELECT count(*) FROM lesson_progress lp
                   JOIN lessons l ON l.id = lp.lesson_id
                   JOIN modules m ON m.id = l.module_id
                  WHERE lp.enrolment_id = e.id
                    AND lp.completed
                    AND l.is_required
                    AND m.course_id = e.course_id) AS lessons_completed,
                (SELECT max(qa.score_percent) FROM quiz_attempts qa
                   JOIN quizzes q ON q.id = qa.quiz_id
                  WHERE qa.enrolment_id = e.id
                    AND q.kind = 'final'
                    AND qa.submitted_at IS NOT NULL) AS final_score_percent,
                -- Revoked certificates are deliberately not surfaced here: the
                -- contract carries no status, so showing one would read as valid.
                (SELECT cert.verification_id FROM certificates cert
                  WHERE cert.enrolment_id = e.id
                    AND cert.status = 'valid') AS certificate_verification_id
           FROM enrolments e
           JOIN users u ON u.id = e.user_id
          WHERE e.course_id = $1
          ORDER BY e.enrolled_at DESC`,
        [courseId],
      );

      return rows.map((row) => {
        const total = Number(row.lessons_total);
        const completed = Number(row.lessons_completed);
        return {
          userId: row.user_id,
          enrolmentId: row.enrolment_id,
          fullName: row.full_name,
          email: row.email,
          status: row.status,
          enrolledAt: row.enrolled_at.toISOString(),
          completedAt: row.completed_at?.toISOString() ?? null,
          progressPercent: total === 0 ? 0 : Math.round((completed / total) * 100),
          lessonsCompleted: completed,
          lessonsTotal: total,
          finalScorePercent: row.final_score_percent,
          certificateVerificationId: row.certificate_verification_id,
        };
      });
    },
  });
}
