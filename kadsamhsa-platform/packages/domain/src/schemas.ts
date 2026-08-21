import { z } from 'zod';

/**
 * Request validation shared by the API (which enforces it) and the web client
 * (which uses it for form-level feedback). Keeping one definition means a
 * client-side rule can never drift looser than the server's.
 */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email('Enter a valid email address');

/**
 * Deliberately length-first rather than composition rules: NIST guidance, and
 * a practical fit for learners typing on phones.
 */
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(200, 'Password is too long');

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name').max(150),
  email: emailSchema,
  password: passwordSchema,
  /** NDPA consent must be explicit and is recorded with a timestamp. */
  acceptedPrivacyPolicy: z.literal(true, {
    message: 'You must accept the privacy policy to register',
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Enter your password'),
});

export const passwordResetRequestSchema = z.object({
  email: emailSchema,
});

export const passwordResetSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});

export const courseListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  priceType: z.enum(['free', 'paid']).optional(),
  category: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(24),
});

export const lessonProgressSchema = z.object({
  completed: z.boolean(),
  /** Seconds of content consumed, used to resume mid-lesson. */
  positionSeconds: z.number().int().min(0).max(86_400).optional(),
});

/**
 * Verification IDs are non-guessable and printed on certificates. Accept the
 * hyphenated display form and normalise it.
 */
export const verificationIdSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{8,40}$/, 'Enter a valid certificate ID');

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CourseListQuery = z.infer<typeof courseListQuerySchema>;
export type LessonProgressInput = z.infer<typeof lessonProgressSchema>;
