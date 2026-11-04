import { ActionButtonForm } from '@/components/shop-catalogue/shop-catalogue-forms';
import { Alert } from '@/components/ui/alert';
import type { ShopReviewState } from '@/lib/api/shop-review';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';
import { formatDate, formatDateTime } from '@/lib/format';
import { checklistItemName, reviewReasonLabel } from '@/lib/shops/review';

type OneButtonAction = () => Promise<CatalogueFormState>;

/**
 * The review step of the shop overview (PLT-002): what the owner can do next
 * for each status. The API decides what is allowed; this only shows it.
 */
export function ReviewPanel({
  review,
  canEdit,
  submitAction,
  withdrawAction,
}: {
  review: ShopReviewState;
  /** The owner (master account); others see the status only. */
  canEdit: boolean;
  submitAction: OneButtonAction;
  withdrawAction: OneButtonAction;
}) {
  const last = review.lastDecision;

  if (review.status === 'PENDING_REVIEW') {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="info" title="In review">
          Submitted on{' '}
          {review.open
            ? formatDateTime(review.open.submittedAt)
            : 'an earlier date'}
          . The platform team will check your shop. Until then the profile,
          photo and location are locked; products and prices can still be
          changed.
        </Alert>
        {canEdit ? (
          <ActionButtonForm
            action={withdrawAction}
            label="Withdraw to make changes"
            pendingLabel="Withdrawing…"
          />
        ) : null}
      </div>
    );
  }

  if (review.status === 'ACTIVE') {
    return (
      <Alert tone="success" title="Your shop is live">
        {last?.decision === 'APPROVED'
          ? `Approved on ${formatDate(last.decidedAt)}. `
          : ''}
        Changes to the profile, photo and location are saved straight away and
        recorded.
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {review.status === 'CHANGES_REQUESTED' && last ? (
        <Alert tone="info" title="Changes requested">
          <span className="flex flex-col gap-2">
            <span>
              On {formatDate(last.decidedAt)} the platform team asked for these
              changes:
            </span>
            <ul className="list-disc pl-5">
              {last.reasons.map((reason) => (
                <li key={reason}>{reviewReasonLabel(reason)}</li>
              ))}
            </ul>
            {last.note ? (
              <span>
                Note from the platform team: <q>{last.note}</q>
              </span>
            ) : null}
            <span>Fix them, then submit your shop again.</span>
          </span>
        </Alert>
      ) : null}
      {review.canSubmit ? (
        canEdit ? (
          <div className="flex flex-col items-start gap-2">
            <p className="text-body-large text-text-secondary">
              Your checklist is complete. Submit your shop for review by the
              platform team.
            </p>
            <ActionButtonForm
              action={submitAction}
              label={
                review.status === 'CHANGES_REQUESTED'
                  ? 'Submit again for review'
                  : 'Submit for review'
              }
              pendingLabel="Submitting…"
              variant="primary"
            />
          </div>
        ) : null
      ) : (
        <p className="text-body-large text-text-secondary">
          Complete the checklist, then submit your shop for review. Still to do:{' '}
          {review.missing.map(checklistItemName).join(', ')}.
        </p>
      )}
    </div>
  );
}
