import { z } from 'zod';

/** RFC 9457 problem document returned by the API for every error. */
export const problemSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number(),
  detail: z.string().optional(),
  code: z.string().optional(),
  errors: z
    .array(z.object({ path: z.string(), message: z.string() }))
    .optional(),
});

export type Problem = z.infer<typeof problemSchema>;

/** A non-2xx API response. `problem` is null when the body was not a problem document. */
export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    readonly status: number,
    readonly problem: Problem | null,
  ) {
    super(`API request failed with status ${status}.`);
  }

  get code(): string | undefined {
    return this.problem?.code;
  }
}

/** The API could not be reached at all (network failure, DNS, refused connection). */
export class ApiUnavailableError extends Error {
  override readonly name = 'ApiUnavailableError';
}

export function parseProblem(body: unknown): Problem | null {
  const result = problemSchema.safeParse(body);
  return result.success ? result.data : null;
}

/** Field errors keyed by their dotted path, e.g. `{ 'master.phone': 'Enter …' }`. */
export function fieldErrorsOf(problem: Problem | null): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const { path, message } of problem?.errors ?? []) {
    errors[path] ??= message;
  }
  return errors;
}
