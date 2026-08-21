import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id at OWASP's recommended baseline (19 MiB, 2 iterations, parallelism
 * 1). These parameters are stored implicitly in the encoded hash, so raising
 * them later does not invalidate existing passwords.
 */
const OPTIONS = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTIONS);
}

export async function verifyPassword(plain: string, encoded: string): Promise<boolean> {
  try {
    return await verify(encoded, plain, OPTIONS);
  } catch {
    // A malformed or legacy (Moodle) hash is a failed login, not a 500.
    return false;
  }
}
