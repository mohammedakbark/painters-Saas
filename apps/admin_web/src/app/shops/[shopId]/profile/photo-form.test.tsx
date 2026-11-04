import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkPhotoFile,
  PHOTO_MAX_BYTES,
  PHOTO_MESSAGES,
  type PhotoFormState,
} from '@/lib/shops/photo';
import { ShopPhotoForm } from './photo-form';

const noopAction = vi.fn(
  async (previous: PhotoFormState): Promise<PhotoFormState> => previous,
);

function file(name: string, type: string, bytes = 1024): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('checkPhotoFile', () => {
  it('accepts JPEG, PNG and WebP up to 5 MB, and files without a type', () => {
    expect(checkPhotoFile({ size: 1000, type: 'image/jpeg' })).toBeNull();
    expect(
      checkPhotoFile({ size: PHOTO_MAX_BYTES, type: 'image/webp' }),
    ).toBeNull();
    expect(checkPhotoFile({ size: 1000, type: '' })).toBeNull();
  });

  it('rejects a missing, empty, oversized or other file', () => {
    expect(checkPhotoFile(null)).toBe(PHOTO_MESSAGES.required);
    expect(checkPhotoFile({ size: 0, type: 'image/png' })).toBe(
      PHOTO_MESSAGES.required,
    );
    expect(
      checkPhotoFile({ size: PHOTO_MAX_BYTES + 1, type: 'image/png' }),
    ).toBe(PHOTO_MESSAGES.size);
    expect(checkPhotoFile({ size: 1000, type: 'image/heic' })).toBe(
      PHOTO_MESSAGES.type,
    );
  });
});

describe('ShopPhotoForm', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows "No photo yet" and an upload control for the owner', () => {
    render(<ShopPhotoForm action={noopAction} currentUrl={null} canEdit />);
    expect(screen.getByText('No photo yet.')).toBeTruthy();
    expect(screen.getByLabelText('Choose a photo')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Upload photo' })).toBeTruthy();
  });

  it('shows the current photo, then a preview of the chosen file', () => {
    render(
      <ShopPhotoForm
        action={noopAction}
        currentUrl="https://media.test/photo-1600.webp"
        canEdit
      />,
    );
    expect(screen.getByAltText('Current shop photo').getAttribute('src')).toBe(
      'https://media.test/photo-1600.webp',
    );

    fireEvent.change(screen.getByLabelText('Choose a new photo'), {
      target: { files: [file('shop.jpg', 'image/jpeg')] },
    });
    expect(
      screen.getByAltText('Preview of the chosen photo').getAttribute('src'),
    ).toBe('blob:preview');
  });

  it('refuses a file that is too large or of another type before uploading', () => {
    render(<ShopPhotoForm action={noopAction} currentUrl={null} canEdit />);
    const input = screen.getByLabelText('Choose a photo');

    fireEvent.change(input, {
      target: { files: [file('big.jpg', 'image/jpeg', PHOTO_MAX_BYTES + 1)] },
    });
    expect(screen.getByRole('alert').textContent).toBe(PHOTO_MESSAGES.size);

    fireEvent.change(input, {
      target: { files: [file('shop.heic', 'image/heic')] },
    });
    expect(screen.getByRole('alert').textContent).toBe(PHOTO_MESSAGES.type);
    expect(screen.getByText('No photo yet.')).toBeTruthy();
  });

  it('asks for a file when submitted empty and does not call the action', () => {
    render(<ShopPhotoForm action={noopAction} currentUrl={null} canEdit />);
    fireEvent.click(screen.getByRole('button', { name: 'Upload photo' }));
    expect(screen.getByRole('alert').textContent).toBe(PHOTO_MESSAGES.required);
    expect(noopAction).not.toHaveBeenCalled();
  });

  it('is view-only for members who cannot edit', () => {
    render(
      <ShopPhotoForm
        action={noopAction}
        currentUrl="https://media.test/photo-1600.webp"
        canEdit={false}
      />,
    );
    expect(screen.getByAltText('Current shop photo')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Upload photo' })).toBeNull();
  });
});
