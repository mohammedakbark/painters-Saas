import { describe, expect, it } from 'vitest';
import {
  geolocationErrorMessage,
  GEOLOCATION_MESSAGES,
  isInIndia,
} from './geolocation';
import { suggestAddress } from './map-address';

describe('suggestAddress', () => {
  it('reads Geocoder components (long_name/short_name)', () => {
    expect(
      suggestAddress([
        { types: ['street_number'], long_name: '12/345', short_name: '12/345' },
        { types: ['route'], long_name: 'MG Road', short_name: 'MG Rd' },
        {
          types: ['sublocality_level_1', 'sublocality', 'political'],
          long_name: 'Ravipuram',
          short_name: 'Ravipuram',
        },
        {
          types: ['locality', 'political'],
          long_name: 'Kochi',
          short_name: 'Kochi',
        },
        {
          types: ['administrative_area_level_2', 'political'],
          long_name: 'Ernakulam',
          short_name: 'EKM',
        },
        {
          types: ['administrative_area_level_1', 'political'],
          long_name: 'Kerala',
          short_name: 'KL',
        },
        {
          types: ['country', 'political'],
          long_name: 'India',
          short_name: 'IN',
        },
        { types: ['postal_code'], long_name: '682016', short_name: '682016' },
      ]),
    ).toEqual({
      line1: '12/345, MG Road',
      line2: 'Ravipuram',
      city: 'Kochi',
      district: 'Ernakulam',
      stateCode: 'KL',
      postalCode: '682016',
    });
  });

  it('reads Places API (New) components (longText/shortText) and matches the state by name', () => {
    expect(
      suggestAddress([
        { types: ['premise'], longText: 'Lakshmi Towers', shortText: null },
        {
          types: ['administrative_area_level_1'],
          longText: 'Tamil Nadu',
          shortText: 'Tamil Nadu',
        },
      ]),
    ).toMatchObject({
      line1: 'Lakshmi Towers',
      stateCode: 'TN',
      postalCode: '',
    });
  });

  it('leaves unknown states and malformed PIN codes empty, and returns null for nothing', () => {
    expect(
      suggestAddress([
        { types: ['administrative_area_level_1'], long_name: 'California' },
        { types: ['postal_code'], long_name: '94043' },
        { types: ['locality'], long_name: 'Mountain View' },
      ]),
    ).toMatchObject({ stateCode: '', postalCode: '', city: 'Mountain View' });
    expect(suggestAddress([])).toBeNull();
  });
});

describe('geolocation helpers', () => {
  it('maps browser error codes to messages', () => {
    expect(geolocationErrorMessage(1)).toBe(GEOLOCATION_MESSAGES.denied);
    expect(geolocationErrorMessage(2)).toBe(GEOLOCATION_MESSAGES.unavailable);
    expect(geolocationErrorMessage(3)).toBe(GEOLOCATION_MESSAGES.timeout);
  });

  it('accepts only coordinates inside India', () => {
    expect(isInIndia(9.97, 76.29)).toBe(true);
    expect(isInIndia(51.5, -0.12)).toBe(false);
  });
});
