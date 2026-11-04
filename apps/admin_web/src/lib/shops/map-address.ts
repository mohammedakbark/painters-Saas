import { matchIndianState } from './indian-states';

/**
 * Turns a map service's address components into suggested address fields.
 * Accepts both the Geocoder shape (`long_name`/`short_name`) and the Places
 * API (New) shape (`longText`/`shortText`). The owner always reviews the
 * suggestion before it fills the form (SHP-003): map data can be incomplete
 * or wrong for small Indian shops.
 */
export interface MapAddressComponent {
  types: readonly string[];
  long_name?: string | null;
  short_name?: string | null;
  longText?: string | null;
  shortText?: string | null;
}

export interface SuggestedAddress {
  line1: string;
  line2: string;
  city: string;
  district: string;
  stateCode: string;
  postalCode: string;
}

function long(component: MapAddressComponent): string {
  return (component.longText ?? component.long_name ?? '').trim();
}

function short(component: MapAddressComponent): string {
  return (component.shortText ?? component.short_name ?? '').trim();
}

export function suggestAddress(
  components: readonly MapAddressComponent[],
): SuggestedAddress | null {
  const find = (...types: string[]) =>
    components.find((component) =>
      types.some((type) => component.types.includes(type)),
    );
  const text = (...types: string[]) => {
    const component = find(...types);
    return component ? long(component) : '';
  };

  const line1 = [
    text('premise', 'subpremise', 'establishment'),
    text('street_number'),
    text('route'),
  ]
    .filter(Boolean)
    .join(', ');
  const state = find('administrative_area_level_1');
  const suggestion: SuggestedAddress = {
    line1,
    line2: text('sublocality_level_1', 'sublocality', 'neighborhood'),
    city: text('locality', 'postal_town', 'administrative_area_level_3'),
    district: text('administrative_area_level_2'),
    stateCode: state
      ? (matchIndianState(short(state)) ?? matchIndianState(long(state)) ?? '')
      : '',
    postalCode: /^[1-9]\d{5}$/.test(text('postal_code'))
      ? text('postal_code')
      : '',
  };
  return Object.values(suggestion).some(Boolean) ? suggestion : null;
}
