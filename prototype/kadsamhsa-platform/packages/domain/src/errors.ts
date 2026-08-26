/**
 * Error codes are part of the API contract: the web client branches on `code`,
 * never on the human-readable message.
 */
export const ERROR_CODES = [
  'validation_failed',
  'unauthenticated',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'internal_error',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ApiErrorBody {
  error: {
    code: ErrorCode;
    message: string;
    /** Field-level messages, keyed by form field name. */
    fields?: Record<string, string>;
  };
}

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  validation_failed: 422,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  internal_error: 500,
};

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly fields: Record<string, string> | undefined;

  constructor(code: ErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = STATUS_BY_CODE[code];
    this.fields = fields;
  }

  toBody(): ApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.fields ? { fields: this.fields } : {}),
      },
    };
  }
}

export const unauthenticated = (message = 'Sign in to continue') =>
  new ApiError('unauthenticated', message);

export const forbidden = (message = 'You do not have access to this') =>
  new ApiError('forbidden', message);

export const notFound = (message = 'Not found') => new ApiError('not_found', message);
