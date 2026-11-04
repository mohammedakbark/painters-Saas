import { parseIndianMobile } from '@/lib/phone';

/**
 * Shop profile form (SHP-003). Same rules as UpdateShopProfileRequest in the
 * API, which re-validates everything.
 */

export const LOCATION_SOURCES = ['MAP_PIN', 'DEVICE_GPS'] as const;
export type LocationSource = (typeof LOCATION_SOURCES)[number];

export interface ProfileFormValues {
  supportPhone: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  district: string;
  stateCode: string;
  postalCode: string;
  /** Empty when no location is chosen. */
  latitude: string;
  longitude: string;
  locationSource: LocationSource | '';
}

export type ProfileField = keyof ProfileFormValues;

export interface ProfileFormState {
  values: ProfileFormValues;
  formError?: string;
  fieldErrors?: Partial<Record<ProfileField, string>>;
}

export const PROFILE_MESSAGES = {
  phone: 'Enter a 10-digit Indian mobile number.',
  addressIncomplete:
    'Fill in the shop number and street, city or town, district, state and PIN code, or leave the whole address empty.',
  postalCode: 'Enter the 6-digit PIN code.',
  notAllowed: 'Only the shop owner can change the profile.',
  unavailable: "We couldn't save the profile right now. Try again in a moment.",
} as const;

const ADDRESS_FIELDS = [
  'line1',
  'line2',
  'landmark',
  'city',
  'district',
  'postalCode',
] as const;

const REQUIRED_ADDRESS: Record<
  'line1' | 'city' | 'district' | 'postalCode',
  string
> = {
  line1: 'Enter the shop number, building and street.',
  city: 'Enter the city or town.',
  district: 'Enter the district.',
  postalCode: PROFILE_MESSAGES.postalCode,
};

const MAX_LENGTH: Partial<Record<ProfileField, number>> = {
  line1: 200,
  line2: 200,
  landmark: 120,
  city: 80,
  district: 80,
};

/** The request body for PUT /v1/shops/:shopId/profile. */
export interface ProfileRequestBody {
  supportPhone: string | null;
  address: {
    line1: string;
    line2: string | null;
    landmark: string | null;
    city: string;
    district: string;
    stateCode: string;
    postalCode: string;
  } | null;
  location?: { latitude: number; longitude: number; source: LocationSource };
}

export type ProfileParseResult =
  | { ok: true; body: ProfileRequestBody }
  | { ok: false; fieldErrors: Partial<Record<ProfileField, string>> };

/**
 * Turns the submitted form into the API body. A blank support mobile or a
 * fully blank address means "not set"; a missing location means "unchanged".
 */
export function parseProfileForm(
  values: ProfileFormValues,
): ProfileParseResult {
  const fieldErrors: Partial<Record<ProfileField, string>> = {};
  const trimmed = (field: ProfileField) => values[field].trim();

  let supportPhone: string | null = null;
  if (trimmed('supportPhone') !== '') {
    supportPhone = parseIndianMobile(values.supportPhone);
    if (supportPhone === null) {
      fieldErrors.supportPhone = PROFILE_MESSAGES.phone;
    }
  }

  for (const [field, max] of Object.entries(MAX_LENGTH) as [
    ProfileField,
    number,
  ][]) {
    if (trimmed(field).length > max) {
      fieldErrors[field] = `Use at most ${max} characters.`;
    }
  }

  const anyAddress = ADDRESS_FIELDS.some((field) => trimmed(field) !== '');
  let address: ProfileRequestBody['address'] = null;
  if (anyAddress) {
    for (const [field, message] of Object.entries(REQUIRED_ADDRESS) as [
      keyof typeof REQUIRED_ADDRESS,
      string,
    ][]) {
      if (trimmed(field) === '') {
        fieldErrors[field] ??= message;
      }
    }
    if (
      trimmed('postalCode') !== '' &&
      !/^[1-9]\d{5}$/.test(trimmed('postalCode'))
    ) {
      fieldErrors.postalCode = PROFILE_MESSAGES.postalCode;
    }
    if (trimmed('stateCode') === '') {
      fieldErrors.stateCode = 'Choose the state.';
    }
    address = {
      line1: trimmed('line1'),
      line2: trimmed('line2') || null,
      landmark: trimmed('landmark') || null,
      city: trimmed('city'),
      district: trimmed('district'),
      stateCode: trimmed('stateCode'),
      postalCode: trimmed('postalCode'),
    };
  }

  let location: ProfileRequestBody['location'];
  if (
    values.latitude !== '' &&
    values.longitude !== '' &&
    values.locationSource !== ''
  ) {
    const latitude = Number.parseFloat(values.latitude);
    const longitude = Number.parseFloat(values.longitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      location = {
        latitude,
        longitude,
        source: values.locationSource,
      };
    } else {
      fieldErrors.latitude = 'Choose the shop location again.';
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }
  return {
    ok: true,
    body: { supportPhone, address, ...(location ? { location } : {}) },
  };
}

/** Maps API field paths (`address.postalCode`, `location.latitude`) to form fields. */
export function profileFieldErrors(
  errors: readonly { path: string; message: string }[],
): Partial<Record<ProfileField, string>> {
  const fieldErrors: Partial<Record<ProfileField, string>> = {};
  for (const { path, message } of errors) {
    const [head, tail] = path.split('.');
    const field: ProfileField | undefined =
      head === 'supportPhone'
        ? 'supportPhone'
        : head === 'address' && tail && isAddressField(tail)
          ? tail
          : head === 'location'
            ? 'latitude'
            : undefined;
    if (field && !fieldErrors[field]) {
      fieldErrors[field] = message;
    }
  }
  return fieldErrors;
}

function isAddressField(name: string): name is ProfileField {
  return [...ADDRESS_FIELDS, 'stateCode'].includes(name);
}

export function readProfileForm(formData: FormData): ProfileFormValues {
  const text = (name: ProfileField) => String(formData.get(name) ?? '');
  const source = text('locationSource');
  return {
    supportPhone: text('supportPhone'),
    line1: text('line1'),
    line2: text('line2'),
    landmark: text('landmark'),
    city: text('city'),
    district: text('district'),
    stateCode: text('stateCode'),
    postalCode: text('postalCode'),
    latitude: text('latitude'),
    longitude: text('longitude'),
    locationSource: (LOCATION_SOURCES as readonly string[]).includes(source)
      ? (source as LocationSource)
      : '',
  };
}

/** "9.965812, 76.289877" for display. */
export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export function locationSourceLabel(source: LocationSource): string {
  return source === 'DEVICE_GPS' ? 'from your device' : 'placed on the map';
}
