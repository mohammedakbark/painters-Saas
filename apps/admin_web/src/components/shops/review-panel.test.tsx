import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ShopReviewState } from '@/lib/api/shop-review';
import { ReviewPanel } from './review-panel';

const base: ShopReviewState = {
  status: 'DRAFT',
  missing: [],
  canSubmit: true,
  open: null,
  lastDecision: null,
};

function renderPanel(review: Partial<ShopReviewState>, canEdit = true) {
  return render(
    <ReviewPanel
      review={{ ...base, ...review }}
      canEdit={canEdit}
      submitAction={vi.fn(async () => ({}))}
      withdrawAction={vi.fn(async () => ({}))}
    />,
  );
}

describe('ReviewPanel', () => {
  it('lists what is still to do before a draft can be submitted', () => {
    renderPanel({ canSubmit: false, missing: ['photo', 'products'] });
    expect(
      screen.getByText(/Still to do:\s*shop photo, 10 products\./),
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('offers the submission when the checklist is complete', () => {
    renderPanel({});
    expect(
      screen.getByRole('button', { name: 'Submit for review' }),
    ).toBeTruthy();
  });

  it('hides the buttons from members who are not the owner', () => {
    renderPanel({}, false);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('explains the lock and offers a withdrawal while in review', () => {
    renderPanel({
      status: 'PENDING_REVIEW',
      canSubmit: false,
      open: { submittedAt: '2026-11-04T05:00:00.000Z' },
    });
    expect(screen.getByText('In review')).toBeTruthy();
    expect(
      screen.getByText(/profile,\s+photo and location are locked/),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Withdraw to make changes' }),
    ).toBeTruthy();
  });

  it('shows the requested changes in words with the note', () => {
    renderPanel({
      status: 'CHANGES_REQUESTED',
      lastDecision: {
        decision: 'CHANGES_REQUESTED',
        reasons: ['PHOTO_MISSING_OR_UNCLEAR', 'OTHER'],
        note: 'Show the name board.',
        decidedAt: '2026-11-04T06:00:00.000Z',
      },
    });
    expect(screen.getByText('Changes requested')).toBeTruthy();
    expect(
      screen.getByText('The shop photo is missing or unclear'),
    ).toBeTruthy();
    expect(screen.getByText('Show the name board.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Submit again for review' }),
    ).toBeTruthy();
  });

  it('tells the owner when the shop is live', () => {
    renderPanel({
      status: 'ACTIVE',
      canSubmit: false,
      lastDecision: {
        decision: 'APPROVED',
        reasons: [],
        note: null,
        decidedAt: '2026-11-04T06:00:00.000Z',
      },
    });
    expect(screen.getByText('Your shop is live')).toBeTruthy();
    expect(screen.getByText(/Approved on 4 Nov 2026/)).toBeTruthy();
  });
});
