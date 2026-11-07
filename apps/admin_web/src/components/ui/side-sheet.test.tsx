import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import {
  SideSheet,
  SideSheetButton,
  useCloseSheetOnSave,
  useSideSheet,
} from './side-sheet';

/** A stand-in form: "Save" reports success like a Server Action would. */
function FakeForm() {
  const [state, setState] = useState<{ saved?: string }>({});
  const [draft, setDraft] = useState('');
  const sheet = useSideSheet();
  useCloseSheetOnSave(state);
  return (
    <div>
      <label>
        Code
        <input value={draft} onChange={(e) => setDraft(e.target.value)} />
      </label>
      <button type="button" onClick={() => setState({ saved: 'Shade added.' })}>
        Save
      </button>
      <button type="button" onClick={sheet?.close}>
        Cancel
      </button>
    </div>
  );
}

function setup(defaultOpen = false) {
  render(
    <>
      <SideSheetButton sheet="add-shade" icon="plus">
        Add shade
      </SideSheetButton>
      <SideSheet
        id="add-shade"
        title="Add a shade"
        description="Codes you mix."
        defaultOpen={defaultOpen}
      >
        <FakeForm />
      </SideSheet>
    </>,
  );
  return screen.getByRole('dialog', { hidden: true }) as HTMLDialogElement;
}

describe('SideSheet', () => {
  it('opens from its button and closes with Close or Cancel', () => {
    const dialog = setup();
    expect(dialog.open).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Add shade' }));
    expect(dialog.open).toBe(true);
    expect(screen.getByRole('heading', { name: 'Add a shade' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(dialog.open).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Add shade' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(dialog.open).toBe(false);
  });

  it('opens on load with defaultOpen and closes on Escape or a backdrop click', () => {
    const dialog = setup(true);
    expect(dialog.open).toBe(true);
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    expect(dialog.open).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Add shade' }));
    fireEvent.click(dialog);
    expect(dialog.open).toBe(false);
  });

  it('keeps a draft when closed, and after a save closes, clears and shows a toast', () => {
    const dialog = setup(true);
    fireEvent.change(screen.getByLabelText('Code'), {
      target: { value: 'ZZ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add shade' }));
    expect((screen.getByLabelText('Code') as HTMLInputElement).value).toBe(
      'ZZ',
    );

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    });
    expect(dialog.open).toBe(false);
    expect(screen.getByRole('status').textContent).toContain('Shade added.');
    fireEvent.click(screen.getByRole('button', { name: 'Add shade' }));
    expect((screen.getByLabelText('Code') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
