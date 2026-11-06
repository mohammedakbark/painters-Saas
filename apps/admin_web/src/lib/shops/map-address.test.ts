import { describe, expect, it } from 'vitest';
import {
  geolocationErrorMessage,
  GEOLOCATION_MESSAGES,
  isInIndia,
} from './geolocation';
import { suggestAddress } from './map-address';

describe('suggestAddress', () => {
  it('reads a Nominatim address and the state from its ISO code', () => {
    expect(
      suggestAddress({
        shop: 'Lakshmi Paints',
        house_number: '12/345',
        road: 'MG Road',
        suburb: 'Ravipuram',
        city: 'Kochi',
        state_district: 'Ernakulam',
        state: 'Kerala',
        postcode: '682 016',
        'ISO3166-2-lvl4': 'IN-KL',
      }),
    ).toEqual({
      line1: 'Lakshmi Paints, 12/345, MG Road',
      line2: 'Ravipuram',
      city: 'Kochi',
      district: 'Ernakulam',
      stateCode: 'KL',
      postalCode: '682016',
    });
  });

  it('falls back to town, county and the state name', () => {
    expect(
      suggestAddress({
        road: 'Temple Road',
        town: 'Perumbavoor',
        county: 'Ernakulam',
        state: 'Kerala',
        'ISO3166-2-lvl4': 'IN-XX',
      }),
    ).toEqual({
      line1: 'Temple Road',
      line2: '',
      city: 'Perumbavoor',
      district: 'Ernakulam',
      stateCode: 'KL',
      postalCode: '',
    });
  });

  it('leaves unknown states and malformed PIN codes empty, and returns null for nothing', () => {
    expect(suggestAddress({ state: 'Atlantis', postcode: '12345' })).toBeNull();
    expect(suggestAddress({})).toBeNull();
    expect(suggestAddress(null)).toBeNull();
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
