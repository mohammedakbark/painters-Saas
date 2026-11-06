import type { OsmAddress } from '@/lib/maps/openstreetmap';
import { matchIndianState } from './indian-states';

/**
 * Turns the address of a map pin (OpenStreetMap / Nominatim) into suggested
 * address fields. The owner always reviews the suggestion before it fills
 * the form (SHP-003): map data can be incomplete or wrong for small Indian
 * shops.
 */
export interface SuggestedAddress {
  line1: string;
  line2: string;
  city: string;
  district: string;
  stateCode: string;
  postalCode: string;
}

const first = (...values: (string | undefined)[]) =>
  values.map((value) => value?.trim() ?? '').find(Boolean) ?? '';

/** "IN-KL" → "KL"; falls back to the state name. */
function stateCode(address: OsmAddress): string {
  const iso = address['ISO3166-2-lvl4'];
  const fromIso = iso?.startsWith('IN-')
    ? matchIndianState(iso.slice(3))
    : null;
  return fromIso ?? matchIndianState(address.state) ?? '';
}

export function suggestAddress(
  address: OsmAddress | null,
): SuggestedAddress | null {
  if (!address) {
    return null;
  }
  const line1 = [
    first(address.shop, address.amenity, address.building, address.house_name),
    first(address.house_number),
    first(address.road),
  ]
    .filter(Boolean)
    .join(', ');
  const postcode = first(address.postcode).replace(/\s/g, '');
  const suggestion: SuggestedAddress = {
    line1,
    line2: first(address.suburb, address.neighbourhood, address.quarter),
    city: first(
      address.city,
      address.town,
      address.village,
      address.municipality,
      address.city_district,
    ),
    district: first(address.state_district, address.county),
    stateCode: stateCode(address),
    postalCode: /^[1-9]\d{5}$/.test(postcode) ? postcode : '',
  };
  return Object.values(suggestion).some(Boolean) ? suggestion : null;
}
