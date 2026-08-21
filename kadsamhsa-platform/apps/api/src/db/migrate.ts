import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

/**
 * Forward-only SQL migrations, applied in filename order inside a transaction
 * each. A partially applied file rolls back rather than leaving the schema in a
 * state no later migration expects.
 */
const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '../../migrations');

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function migrate(): Promise<string[]> {
  await ensureMigrationsTable();

  const applied = new Set(
    (await pool.query<{ filename: string }>('SELECT filename FROM schema_migrations')).rows.map(
      (row) => row.filename,
    ),
  );

  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();

  const ran: string[] = [];

  for (const filename of files) {
    if (applied.has(filename)) {
      continue;
    }
    const sql = await readFile(join(migrationsDir, filename), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
      await client.query('COMMIT');
      ran.push(filename);
      console.log(`applied ${filename}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Migration ${filename} failed: ${(error as Error).message}`);
    } finally {
      client.release();
    }
  }

  if (ran.length === 0) {
    console.log('schema up to date');
  }
  return ran;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate()
    .then(() => pool.end())
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
      return pool.end();
    });
}
