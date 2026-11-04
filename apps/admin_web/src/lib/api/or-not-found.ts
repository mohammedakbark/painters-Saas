import 'server-only';
import { notFound } from 'next/navigation';
import { ApiError } from './problem';

/** 404 from the API → the not-found page; anything else is rethrown. */
export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }
    throw error;
  }
}
