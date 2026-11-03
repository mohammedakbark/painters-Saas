import {
  HttpStatus,
  StandardSchemaValidationPipe,
  type StandardSchemaValidationPipeOptions,
} from '@nestjs/common';
import {
  type ProblemFieldError,
  ProblemException,
} from '../http/problem-details.js';

/** Standard Schema issue type, taken from Nest's pipe options. */
type ValidationIssue = Parameters<
  NonNullable<StandardSchemaValidationPipeOptions['exceptionFactory']>
>[0][number];

/**
 * Global pipe that validates every `@Body/@Query/@Param({ schema })` argument
 * against its Zod (Standard Schema) schema and returns the parsed value.
 * Failures become a 400 problem with one entry per invalid field.
 */
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) =>
      new ProblemException(HttpStatus.BAD_REQUEST, {
        detail: 'The request is invalid.',
        code: 'validation_failed',
        errors: toFieldErrors(issues),
      }),
  });
}

export function toFieldErrors(
  issues: readonly ValidationIssue[],
): ProblemFieldError[] {
  return issues.map((issue) => ({
    path: formatPath(issue.path),
    message: issue.message,
  }));
}

function formatPath(path: ValidationIssue['path']): string {
  if (!path || path.length === 0) {
    return '';
  }
  return path
    .map((segment) =>
      String(typeof segment === 'object' ? segment.key : segment),
    )
    .join('.');
}
