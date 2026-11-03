import 'server-only';
import type { z } from 'zod';
import { serverEnv } from '@/lib/env';
import { ApiError, ApiUnavailableError, parseProblem } from './problem';

export interface ApiRequest<T> {
  /** Supabase access token of the signed-in user. */
  token: string;
  /** Validates and types the response body. */
  schema: z.ZodType<T>;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
}

/**
 * Calls the NestJS API from the server with the user's bearer token. Never
 * cached: every response depends on who is asking.
 */
export async function apiRequest<T>(
  path: string,
  request: ApiRequest<T>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(new URL(path, serverEnv().API_BASE_URL), {
      method: request.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${request.token}`,
        ...(request.body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),
      },
      body:
        request.body === undefined ? undefined : JSON.stringify(request.body),
      cache: 'no-store',
    });
  } catch (error) {
    throw new ApiUnavailableError('The API could not be reached.', {
      cause: error,
    });
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    throw new ApiError(response.status, parseProblem(body));
  }
  return request.schema.parse(await response.json());
}
