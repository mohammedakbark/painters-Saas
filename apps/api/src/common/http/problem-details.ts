import { HttpException, HttpStatus } from '@nestjs/common';
import { z } from 'zod';

/** Media type for every error response (RFC 9457). */
export const PROBLEM_CONTENT_TYPE = 'application/problem+json';

/** One invalid input field. `path` is dotted, for example `master.phone`. */
export interface ProblemFieldError {
  path: string;
  message: string;
}

/**
 * RFC 9457 problem details. `type` is `about:blank` for now, so `title` is the
 * HTTP status phrase. `code` is a stable machine-readable extension that
 * clients can branch on; `errors` lists field-level validation problems.
 */
export interface ProblemDetails {
  type: 'about:blank';
  title: string;
  status: number;
  detail?: string;
  code?: string;
  errors?: ProblemFieldError[];
}

/** OpenAPI description of the error body. */
export const ProblemDetailsSchema = z
  .object({
    type: z.literal('about:blank'),
    title: z.string(),
    status: z.int(),
    detail: z.string().optional(),
    code: z.string().optional(),
    errors: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .optional(),
  })
  .meta({ id: 'ProblemDetails' });

export interface ProblemOptions {
  /** Human-readable explanation safe to show to the client. */
  detail?: string;
  code?: string;
  errors?: ProblemFieldError[];
  /** Extra response headers, for example `WWW-Authenticate`. */
  headers?: Record<string, string>;
}

/**
 * Throw this for every expected error. The detail and code are sent to the
 * client as-is, so they must never contain internal or sensitive information.
 */
export class ProblemException extends HttpException {
  readonly problem: ProblemDetails;
  readonly headers: Readonly<Record<string, string>>;

  constructor(status: HttpStatus, options: ProblemOptions = {}) {
    const problem: ProblemDetails = {
      type: 'about:blank',
      title: statusTitle(status),
      status,
      ...(options.detail === undefined ? {} : { detail: options.detail }),
      ...(options.code === undefined ? {} : { code: options.code }),
      ...(options.errors === undefined ? {} : { errors: options.errors }),
    };
    super(problem, status);
    this.problem = problem;
    this.headers = options.headers ?? {};
  }
}

const STATUS_TITLES: Partial<Record<number, string>> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  413: 'Content Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Content',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

export function statusTitle(status: number): string {
  return (
    STATUS_TITLES[status] ?? (status >= 500 ? 'Server Error' : 'Client Error')
  );
}
