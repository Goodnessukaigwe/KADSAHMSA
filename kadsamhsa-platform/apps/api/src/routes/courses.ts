import type { FastifyInstance } from 'fastify';
import type { CourseDetail, CourseSummary, ModuleOutline } from '@kadsamhsa/domain';
import { courseListQuerySchema, notFound } from '@kadsamhsa/domain';
import { query, queryOne } from '../db/pool.js';

interface CourseRow {
  id: string;
  slug: string;
  title: string;
  summary: string;
  cover_image_url: string | null;
  price_type: 'free' | 'paid';
  price_amount: number | null;
  currency: string;
  duration_minutes: number | null;
  category_name: string | null;
  lesson_count: string;
}

function toSummary(row: CourseRow): CourseSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    coverImageUrl: row.cover_image_url,
    priceType: row.price_type,
    priceAmount: row.price_amount,
    currency: row.currency,
    durationMinutes: row.duration_minutes,
    categoryName: row.category_name,
    lessonCount: Number(row.lesson_count),
  };
}

/**
 * Public catalogue (PRD F1, F2). These routes are deliberately unauthenticated
 * and expose only published courses — `status = 'published'` is applied in SQL
 * rather than filtered afterwards, so a draft cannot leak through a code path
 * that forgets to check.
 */
export async function courseRoutes(app: FastifyInstance) {
  app.get('/courses', async (request) => {
    const { search, priceType, category, page, pageSize } = courseListQuerySchema.parse(
      request.query,
    );

    const conditions = [`c.status = 'published'`];
    const params: (string | number)[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(c.title ILIKE $${params.length} OR c.summary ILIKE $${params.length})`);
    }
    if (priceType) {
      params.push(priceType);
      conditions.push(`c.price_type = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`cat.slug = $${params.length}`);
    }

    const where = conditions.join(' AND ');

    const totalRow = await queryOne<{ count: string }>(
      `SELECT count(*) AS count
         FROM courses c
         LEFT JOIN course_categories cat ON cat.id = c.category_id
        WHERE ${where}`,
      params,
    );

    params.push(pageSize, (page - 1) * pageSize);

    const rows = await query<CourseRow>(
      `SELECT c.id, c.slug, c.title, c.summary, c.cover_image_url, c.price_type,
              c.price_amount, c.currency, c.duration_minutes,
              cat.name AS category_name,
              (SELECT count(*) FROM lessons l
                 JOIN modules m ON m.id = l.module_id
                WHERE m.course_id = c.id) AS lesson_count
         FROM courses c
         LEFT JOIN course_categories cat ON cat.id = c.category_id
        WHERE ${where}
        ORDER BY c.published_at DESC NULLS LAST, c.title ASC
        LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: rows.map(toSummary),
      total: Number(totalRow?.count ?? 0),
      page,
      pageSize,
    };
  });

  app.get<{ Params: { slug: string } }>('/courses/:slug', async (request) => {
    const row = await queryOne<CourseRow & {
      description: string;
      objectives: string[];
      pass_mark_percent: number;
      certificate_enabled: boolean;
    }>(
      `SELECT c.id, c.slug, c.title, c.summary, c.description, c.objectives,
              c.cover_image_url, c.price_type, c.price_amount, c.currency,
              c.duration_minutes, c.pass_mark_percent, c.certificate_enabled,
              cat.name AS category_name,
              (SELECT count(*) FROM lessons l
                 JOIN modules m ON m.id = l.module_id
                WHERE m.course_id = c.id) AS lesson_count
         FROM courses c
         LEFT JOIN course_categories cat ON cat.id = c.category_id
        WHERE c.slug = $1 AND c.status = 'published'`,
      [request.params.slug],
    );

    if (!row) {
      throw notFound('Course not found');
    }

    const outlineRows = await query<{
      module_id: string;
      module_title: string;
      module_position: number;
      lesson_id: string | null;
      lesson_title: string | null;
      lesson_position: number | null;
      lesson_duration: number | null;
    }>(
      `SELECT m.id AS module_id, m.title AS module_title, m.position AS module_position,
              l.id AS lesson_id, l.title AS lesson_title, l.position AS lesson_position,
              l.duration_minutes AS lesson_duration
         FROM modules m
         LEFT JOIN lessons l ON l.module_id = m.id
        WHERE m.course_id = $1
        ORDER BY m.position, l.position`,
      [row.id],
    );

    const modules: ModuleOutline[] = [];
    for (const item of outlineRows) {
      let module = modules.find((m) => m.id === item.module_id);
      if (!module) {
        module = {
          id: item.module_id,
          title: item.module_title,
          position: item.module_position,
          lessons: [],
        };
        modules.push(module);
      }
      if (item.lesson_id) {
        module.lessons.push({
          id: item.lesson_id,
          title: item.lesson_title ?? '',
          position: item.lesson_position ?? 0,
          durationMinutes: item.lesson_duration,
        });
      }
    }

    const detail: CourseDetail = {
      ...toSummary(row),
      description: row.description,
      objectives: Array.isArray(row.objectives) ? row.objectives : [],
      modules,
      certificateAvailable: row.certificate_enabled,
      passMarkPercent: row.pass_mark_percent,
    };

    return detail;
  });
}
