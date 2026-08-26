import { hashPassword } from '../auth/password.js';
import { pool, query, queryOne, transaction } from './pool.js';

/**
 * Development seed: the DPTC launch course from PRD §5, plus one account per
 * role. Idempotent — safe to re-run.
 *
 * The seeded passwords are development-only and the script refuses to run with
 * NODE_ENV=production.
 */
const DPTC_MODULES: { title: string; lessons: number }[] = [
  { title: 'Course Introduction and Outline', lessons: 2 },
  { title: 'The Drug Use Situation in Nigeria', lessons: 3 },
  { title: 'Drugs and Effects: Understanding Drug Dependency', lessons: 2 },
  { title: 'Causes of Drug Use and Associated Stigma of Drug Users', lessons: 2 },
  { title: 'Understanding the Concept of Supply Reduction', lessons: 3 },
  { title: 'Understanding the Concept of Demand and Harm Reduction', lessons: 2 },
  { title: 'Drug Screening: Steps to Take', lessons: 3 },
  { title: 'Types of Drug Treatment', lessons: 2 },
  { title: 'Interventions and Responses to Drug Problems in the Family', lessons: 2 },
  { title: 'Special Populations: Women, People Who Inject Drugs, Young Users', lessons: 3 },
  { title: 'Human Rights and Drug Users', lessons: 2 },
  { title: 'Specific Issues for Law Enforcement', lessons: 3 },
  { title: 'Understanding Advocacy and Steps to Achieve Success', lessons: 2 },
];

const OTHER_COURSES = [
  'Community-Based Substance Abuse First Response',
  'Human Rights Frameworks in Law Enforcement & Care',
  'Family Interventions in Drug Treatment',
  'Advocacy for Drug Prevention Programmes',
];

const SEED_USERS = [
  { email: 'admin@kadsamhsa.org', name: 'KADSAMHSA Admin', role: 'super_admin' },
  { email: 'content@kadsamhsa.org', name: 'Content Admin', role: 'content_admin' },
  { email: 'learner@example.com', name: 'Test Learner', role: 'learner' },
];

const SEED_PASSWORD = 'kadsamhsa-dev-2026';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function seedUsers() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  for (const seed of SEED_USERS) {
    await transaction(async (client) => {
      const result = await client.query<{ id: string }>(
        `INSERT INTO users (email, full_name, email_verified)
         VALUES ($1, $2, TRUE)
         ON CONFLICT (lower(email)) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING id`,
        [seed.email, seed.name],
      );
      const userId = result.rows[0]!.id;

      await client.query(
        `INSERT INTO password_credentials (user_id, password_hash)
         VALUES ($1, $2)
         ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
        [userId, passwordHash],
      );
      await client.query(
        `INSERT INTO user_roles (user_id, role_key) VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, seed.role],
      );
      // Every account is also a learner, so staff can preview as one.
      await client.query(
        `INSERT INTO user_roles (user_id, role_key) VALUES ($1, 'learner')
         ON CONFLICT DO NOTHING`,
        [userId],
      );
    });
    console.log(`user ${seed.email} (${seed.role})`);
  }
}

async function seedCourse(
  title: string,
  summary: string,
  modules: { title: string; lessons: number }[],
  categoryId: string,
  isFeatured = false,
) {
  const slug = slugify(title);

  const course = await queryOne<{ id: string }>(
    `INSERT INTO courses (slug, title, summary, description, objectives, category_id,
                          status, price_type, duration_minutes, published_at, is_featured)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, 'published', 'free', $7, now(), $8)
     ON CONFLICT (slug) DO UPDATE
       SET title = EXCLUDED.title, summary = EXCLUDED.summary, status = 'published',
           is_featured = EXCLUDED.is_featured
     RETURNING id`,
    [
      slug,
      title,
      summary,
      summary,
      JSON.stringify([
        'Understand the national drug use context',
        'Apply evidence-based prevention and treatment concepts',
        'Practise rights-based engagement with people who use drugs',
      ]),
      categoryId,
      modules.reduce((total, m) => total + m.lessons * 15, 0),
      isFeatured,
    ],
  );
  if (!course) {
    throw new Error(`Failed to seed course ${slug}`);
  }

  // Re-running replaces the outline rather than appending a second copy.
  await query(`DELETE FROM modules WHERE course_id = $1`, [course.id]);

  for (const [index, module] of modules.entries()) {
    const moduleRow = await queryOne<{ id: string }>(
      `INSERT INTO modules (course_id, title, position) VALUES ($1, $2, $3) RETURNING id`,
      [course.id, module.title, index],
    );
    if (!moduleRow) {
      continue;
    }
    for (let lesson = 0; lesson < module.lessons; lesson += 1) {
      await query(
        `INSERT INTO lessons (module_id, title, position, duration_minutes)
         VALUES ($1, $2, $3, 15)`,
        [moduleRow.id, `${module.title} — part ${lesson + 1}`, lesson],
      );
    }
  }

  console.log(`course ${slug} (${modules.length} modules)`);
  return course.id;
}

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production database');
  }

  const category = await queryOne<{ id: string }>(
    `INSERT INTO course_categories (slug, name)
     VALUES ('dptc', 'Drug Prevention, Treatment & Care')
     ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
  );
  if (!category) {
    throw new Error('Failed to seed category');
  }

  await seedUsers();

  await seedCourse(
    'Sensitization on Drug Use, Drug Dependence and DPTC',
    'The launch DPTC curriculum: 13 modules covering the drug use situation in Nigeria, dependency, prevention, treatment, care, human rights and advocacy.',
    DPTC_MODULES,
    category.id,
    // The launch course (PRD §5) — what the new-learner dashboard pitches.
    true,
  );

  for (const title of OTHER_COURSES) {
    await seedCourse(
      title,
      'Evidence-based learning with assessments and a verifiable certificate on completion.',
      [
        { title: 'Foundations', lessons: 2 },
        { title: 'Practice', lessons: 2 },
        { title: 'Assessment', lessons: 1 },
      ],
      category.id,
    );
  }

  console.log(`\nSeed accounts use the password: ${SEED_PASSWORD}`);
}

seed()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
    return pool.end();
  });
