import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GEOLOCATION_MESSAGES } from '@/lib/shops/geolocation';
import type { ProfileFormState, ProfileFormValues } from '@/lib/shops/profile';
import { ShopProfileForm } from './profile-form';

const VALUES: ProfileFormValues = {
  supportPhone: '+91 98765 43210',
  line1: 'Door 12, MG Road',
  line2: '',
  landmark: '',
  city: 'Kochi',
  district: 'Ernakulam',
  stateCode: 'KL',
  postalCode: '682016',
  latitude: '',
  longitude: '',
  locationSource: '',
};

const noopAction = vi.fn(
  async (previous: ProfileFormState): Promise<ProfileFormState> => previous,
);

function renderForm(
  overrides: Partial<Parameters<typeof ShopProfileForm>[0]> = {},
) {
  return render(
    <ShopProfileForm
      action={noopAction}
      initialValues={VALUES}
      maps={null}
      canEdit
      cancelHref="/shops/1"
      {...overrides}
    />,
  );
}

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

describe('ShopProfileForm without Google Maps (no key configured)', () => {
  let getCurrentPosition: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getCurrentPosition = vi.fn();
    Object.defineProperty(window, 'isSecureContext', {
      value: true,
      configurable: true,
    });
    Object.defineProperty(navigator, 'geolocation', {
      value: { getCurrentPosition },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the saved values, the no-map notice and the current-location button', () => {
    renderForm();
    expect(screen.getByLabelText('Support mobile number')).toHaveProperty(
      'value',
      '+91 98765 43210',
    );
    expect(screen.getByLabelText('State')).toHaveProperty('value', 'KL');
    expect(screen.getByText(/The map isn.t set up yet/)).toBeTruthy();
    expect(screen.getByText('No location chosen yet.')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Use my current location' }),
    ).toBeTruthy();
  });

  it('uses the device location and submits it in the hidden fields', () => {
    const { container } = renderForm();
    fireEvent.click(
      screen.getByRole('button', { name: 'Use my current location' }),
    );
    const [onSuccess] = getCurrentPosition.mock.calls[0] as [Success];
    act(() =>
      onSuccess({
        coords: { latitude: 10.0261, longitude: 76.3125, accuracy: 12.4 },
      } as GeolocationPosition),
    );

    expect(
      screen.getByText('Pin: 10.026100, 76.312500 (from your device)'),
    ).toBeTruthy();
    expect(screen.getByText(/accurate to about 12 m/)).toBeTruthy();
    const hidden = (name: string) =>
      (container.querySelector(`input[name="${name}"]`) as HTMLInputElement)
        .value;
    expect(hidden('latitude')).toBe('10.0261');
    expect(hidden('longitude')).toBe('76.3125');
    expect(hidden('locationSource')).toBe('DEVICE_GPS');
  });

  it('explains a blocked permission and keeps no location', () => {
    renderForm();
    fireEvent.click(
      screen.getByRole('button', { name: 'Use my current location' }),
    );
    const [, onFailure] = getCurrentPosition.mock.calls[0] as [
      Success,
      Failure,
    ];
    act(() => onFailure({ code: 1 } as GeolocationPositionError));

    expect(screen.getByRole('alert').textContent).toBe(
      GEOLOCATION_MESSAGES.denied,
    );
    expect(screen.getByText('No location chosen yet.')).toBeTruthy();
  });

  it('refuses a device location too rough for a shop pin', () => {
    renderForm();
    fireEvent.click(
      screen.getByRole('button', { name: 'Use my current location' }),
    );
    const [onSuccess] = getCurrentPosition.mock.calls[0] as [Success];
    act(() =>
      onSuccess({
        coords: { latitude: 11.7362, longitude: 75.5227, accuracy: 50_000 },
      } as GeolocationPosition),
    );

    expect(screen.getByRole('alert').textContent).toBe(
      GEOLOCATION_MESSAGES.inaccurate(50_000),
    );
    expect(screen.getByRole('alert').textContent).toContain('about 50 km');
    expect(screen.getByText('No location chosen yet.')).toBeTruthy();
  });

  it('refuses a device location outside India', () => {
    renderForm();
    fireEvent.click(
      screen.getByRole('button', { name: 'Use my current location' }),
    );
    const [onSuccess] = getCurrentPosition.mock.calls[0] as [Success];
    act(() =>
      onSuccess({
        coords: { latitude: 51.5, longitude: -0.12, accuracy: 5 },
      } as GeolocationPosition),
    );
    expect(screen.getByRole('alert').textContent).toBe(
      GEOLOCATION_MESSAGES.outsideIndia,
    );
  });

  it('explains that location needs a secure connection', () => {
    Object.defineProperty(window, 'isSecureContext', {
      value: false,
      configurable: true,
    });
    renderForm();
    fireEvent.click(
      screen.getByRole('button', { name: 'Use my current location' }),
    );
    expect(getCurrentPosition).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe(
      GEOLOCATION_MESSAGES.insecure,
    );
  });

  it('is read-only for members who cannot edit', () => {
    renderForm({ canEdit: false });
    expect(
      screen.getByText('Only the shop owner can change the profile.'),
    ).toBeTruthy();
    // Disabled through the surrounding fieldset.
    expect(
      screen.getByLabelText('Support mobile number').matches(':disabled'),
    ).toBe(true);
    expect(
      screen
        .getByRole('button', { name: 'Use my current location' })
        .matches(':disabled'),
    ).toBe(true);
    expect(screen.queryByRole('button', { name: 'Save profile' })).toBeNull();
  });

  it('shows the field errors the action returns and keeps the typed values', async () => {
    const action = vi.fn<
      (previous: ProfileFormState, data: FormData) => Promise<ProfileFormState>
    >(async () => ({
      values: VALUES,
      fieldErrors: { postalCode: 'Enter the 6-digit PIN code.' },
    }));
    renderForm({ action });
    fireEvent.change(screen.getByLabelText('PIN code'), {
      target: { value: '0123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save profile' }));

    expect(await screen.findByText('Enter the 6-digit PIN code.')).toBeTruthy();
    expect(screen.getByLabelText('PIN code')).toHaveProperty('value', '0123');
    // A controlled select must keep its value after a failed save.
    expect(screen.getByLabelText('State')).toHaveProperty('value', 'KL');
    const submitted = action.mock.calls[0]?.[1];
    expect(submitted?.get('postalCode')).toBe('0123');
    expect(submitted?.get('stateCode')).toBe('KL');
  });
});
