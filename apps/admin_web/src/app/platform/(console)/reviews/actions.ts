'use server';

import { notFound, redirect } from 'next/navigation';
import { ApiError } from '@/lib/api/problem';
import { decideShopReview } from '@/lib/api/shop-review';
import {
  PLATFORM_NO_ACCESS_PATH,
  PLATFORM_SIGN_IN_PATH,
  requirePlatformAdmin,
} from '@/lib/auth/platform-access';
import {
  CATALOGUE_MESSAGES,
  type CatalogueFormState,
  catalogueFieldErrors,
} from '@/lib/catalogue/form-state';

/**
 * Saves a review decision (PLT-002). Re-checks platform admin access; the API
 * authorizes the call and refuses a second decision on the same submission.
 */
export async function decideReviewAction(
  shopId: string,
  _previous: CatalogueFormState,
  formData: FormData,
): Promise<CatalogueFormState> {
  const { token } = await requirePlatformAdmin();
  const decision = String(formData.get('decision') ?? '');
  const reasons = formData
    .getAll('reasons')
    .filter((value): value is string => typeof value === 'string');
  const note = String(formData.get('note') ?? '').trim();
  const values = { decision, reasons: reasons.join(','), note };

  if (decision !== 'APPROVED' && decision !== 'CHANGES_REQUESTED') {
    return {
      values,
      fieldErrors: { decision: 'Choose approve or request changes.' },
    };
  }

  try {
    await decideShopReview(token, shopId, {
      decision,
      // Reasons only go with a change request.
      reasons: decision === 'APPROVED' ? [] : reasons,
      note: note === '' ? null : note,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) {
        redirect(PLATFORM_SIGN_IN_PATH);
      }
      if (error.status === 403) {
        redirect(PLATFORM_NO_ACCESS_PATH);
      }
      if (error.status === 404) {
        notFound();
      }
      if (error.code === 'validation_failed') {
        return {
          values,
          fieldErrors: catalogueFieldErrors(error.problem?.errors ?? []),
        };
      }
      if (error.status === 409 && error.problem?.detail) {
        return { values, error: error.problem.detail };
      }
    }
    return { values, error: CATALOGUE_MESSAGES.unavailable };
  }
  redirect(
    `/platform/reviews?decided=${decision === 'APPROVED' ? 'approved' : 'changes'}`,
  );
}
