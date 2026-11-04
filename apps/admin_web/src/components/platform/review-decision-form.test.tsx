import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CatalogueFormState } from '@/lib/catalogue/form-state';
import { ReviewDecisionForm } from './review-decision-form';

describe('ReviewDecisionForm', () => {
  it('offers both decisions and every reason in words', () => {
    render(<ReviewDecisionForm action={vi.fn(async () => ({}))} />);
    expect(screen.getByLabelText('Approve')).toBeTruthy();
    expect(screen.getByLabelText('Request changes')).toBeTruthy();
    expect(screen.getAllByRole('checkbox')).toHaveLength(7);
    expect(
      screen.getByLabelText('The map location is missing or wrong'),
    ).toBeTruthy();
  });

  it('sends the ticked reasons and keeps them with the error after a failed save', async () => {
    const action = vi.fn(
      async (
        _previous: CatalogueFormState,
        formData: FormData,
      ): Promise<CatalogueFormState> => ({
        values: {
          decision: String(formData.get('decision')),
          reasons: formData.getAll('reasons').join(','),
          note: '',
        },
        fieldErrors: { note: 'Explain the other reason in the note.' },
      }),
    );
    render(<ReviewDecisionForm action={action} />);
    fireEvent.click(screen.getByLabelText('Request changes'));
    fireEvent.click(screen.getByLabelText('Other (see the note)'));
    fireEvent.click(
      screen.getByLabelText('The shop photo is missing or unclear'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save decision' }));

    expect(
      await screen.findByText('Explain the other reason in the note.'),
    ).toBeTruthy();
    const sent = action.mock.calls[0][1];
    expect(sent.get('decision')).toBe('CHANGES_REQUESTED');
    expect(sent.getAll('reasons')).toEqual([
      'PHOTO_MISSING_OR_UNCLEAR',
      'OTHER',
    ]);
    expect(screen.getByLabelText('Request changes')).toHaveProperty(
      'checked',
      true,
    );
    expect(screen.getByLabelText('Other (see the note)')).toHaveProperty(
      'checked',
      true,
    );
  });
});
