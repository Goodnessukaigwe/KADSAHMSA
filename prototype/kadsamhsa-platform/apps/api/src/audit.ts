import type { PoolClient } from 'pg';
import { pool } from './db/pool.js';

export interface AuditEvent {
  actorId: string | null;
  action: string;
  subjectType: string;
  subjectId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
}

/**
 * Appends an immutable audit event.
 *
 * Pass the transaction client when the event must land with the write it
 * describes — an audited action that rolled back should not leave a log row
 * claiming it happened.
 */
export async function recordAudit(event: AuditEvent, client?: PoolClient): Promise<void> {
  const runner = client ?? pool;
  await runner.query(
    `INSERT INTO audit_events (actor_id, action, subject_type, subject_id, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      event.actorId,
      event.action,
      event.subjectType,
      event.subjectId ?? null,
      JSON.stringify(event.metadata ?? {}),
      event.ipAddress ?? null,
    ],
  );
}
