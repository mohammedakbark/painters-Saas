import { describe, expect, it } from 'vitest';
import {
  PROFILE_MESSAGES,
  type ProfileFormValues,
  parseProfileForm,
  profileFieldErrors,
  readProfileForm,
} from './profile';

const EMPTY: ProfileFormValues = {
  supportPhone: '',
  line1: '',
  line2: '',
  landmark: '',
  city: '',
  district: '',
  stateCode: 'KL',
  postalCode: '',
  latitude: '',
  longitude: '',
  locationSource: '',
};

const FULL: ProfileFormValues = {
  ...EMPTY,
  supportPhone: '98765 43210',
  line1: ' Door 12, MG Road ',
  line2: '',
  landmark: 'Opposite the bus stand',
  city: 'Kochi',
  district: 'Ernakulam',
  postalCode: '682016',
  latitude: '9.965812',
  longitude: '76.289877',
  locationSource: 'MAP_PIN',
};

describe('parseProfileForm', () => {
  it('treats a blank form as "nothing set" and leaves the location unchanged', () => {
    expect(parseProfileForm(EMPTY)).toEqual({
      ok: true,
      body: { supportPhone: null, address: null },
    });
  });

  it('normalises a complete form into the API body', () => {
    expect(parseProfileForm(FULL)).toEqual({
      ok: true,
      body: {
        supportPhone: '+919876543210',
        address: {
          line1: 'Door 12, MG Road',
          line2: null,
          landmark: 'Opposite the bus stand',
          city: 'Kochi',
          district: 'Ernakulam',
          stateCode: 'KL',
          postalCode: '682016',
        },
        location: {
          latitude: 9.965812,
          longitude: 76.289877,
          source: 'MAP_PIN',
        },
      },
    });
  });

  it('asks for every missing required field once any address field is typed', () => {
    const result = parseProfileForm({ ...EMPTY, landmark: 'Near the temple' });
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        line1: 'Enter the shop number, building and street.',
        city: 'Enter the city or town.',
        district: 'Enter the district.',
        postalCode: PROFILE_MESSAGES.postalCode,
      },
    });
  });

  it('rejects an invalid mobile number, PIN code and an over-long field', () => {
    const result = parseProfileForm({
      ...FULL,
      supportPhone: '0484 2345678',
      postalCode: '012345',
      landmark: 'x'.repeat(121),
    });
    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        supportPhone: PROFILE_MESSAGES.phone,
        postalCode: PROFILE_MESSAGES.postalCode,
        landmark: 'Use at most 120 characters.',
      },
    });
  });

  it('requires a state when there is an address', () => {
    const result = parseProfileForm({ ...FULL, stateCode: '' });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.fieldErrors.stateCode).toBe(
      'Choose the state.',
    );
  });
});

describe('profileFieldErrors', () => {
  it('maps API paths onto form fields', () => {
    expect(
      profileFieldErrors([
        { path: 'supportPhone', message: 'phone' },
        { path: 'address.postalCode', message: 'pin' },
        { path: 'address.stateCode', message: 'state' },
        { path: 'location.latitude', message: 'india' },
        { path: 'location.longitude', message: 'second' },
        { path: 'unknown', message: 'ignored' },
      ]),
    ).toEqual({
      supportPhone: 'phone',
      postalCode: 'pin',
      stateCode: 'state',
      latitude: 'india',
    });
  });
});

describe('readProfileForm', () => {
  it('reads the fields and drops an unknown location source', () => {
    const data = new FormData();
    data.set('supportPhone', '9876543210');
    data.set('latitude', '10');
    data.set('longitude', '76');
    data.set('locationSource', 'GUESS');
    const values = readProfileForm(data);
    expect(values.supportPhone).toBe('9876543210');
    expect(values.city).toBe('');
    expect(values.locationSource).toBe('');
  });
});
