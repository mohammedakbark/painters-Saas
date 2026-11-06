/**
 * OpenStreetMap services for the shop location picker (SHP-006, D-041).
 *
 * - Map tiles: the OpenStreetMap Foundation's standard tile server.
 * - Search and address lookup: Nominatim.
 *
 * Both are free community services with usage policies:
 * - show the attribution on the map;
 * - at most one Nominatim request per second;
 * - search runs when the owner submits it, never on every keystroke.
 * They suit development and a small number of shops. Before heavy use,
 * switch to a hosted provider by changing the URLs here (D-028).
 */

export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
export const TILE_MAX_ZOOM = 19;

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const MIN_INTERVAL_MS = 1100;

/** The `address` object of a Nominatim result (only the keys we read). */
export interface OsmAddress {
  house_number?: string;
  house_name?: string;
  building?: string;
  shop?: string;
  amenity?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  city_district?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  state?: string;
  postcode?: string;
  'ISO3166-2-lvl4'?: string;
}

export interface OsmPlace {
  id: string;
  /** Full place name, e.g. "Lakshmi Paints, MG Road, Kochi, Kerala, 682016, India". */
  label: string;
  latitude: number;
  longitude: number;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: OsmAddress;
}

let nextAllowedAt = 0;

/** Waits so that requests are at least a second apart (usage policy). */
async function throttle(): Promise<void> {
  const now = Date.now();
  const wait = Math.max(0, nextAllowedAt - now);
  nextAllowedAt = Math.max(now, nextAllowedAt) + MIN_INTERVAL_MS;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
}

async function nominatim<T>(
  path: string,
  params: Record<string, string>,
  signal?: AbortSignal,
): Promise<T> {
  await throttle();
  const query = new URLSearchParams({
    format: 'jsonv2',
    'accept-language': 'en',
    ...params,
  });
  const response = await fetch(`${NOMINATIM}/${path}?${query}`, { signal });
  if (!response.ok) {
    throw new Error(`Nominatim ${path} failed (${response.status})`);
  }
  return (await response.json()) as T;
}

/** Places in India that match the text, best first (at most 5). */
export async function searchPlaces(
  text: string,
  signal?: AbortSignal,
): Promise<OsmPlace[]> {
  const results = await nominatim<NominatimResult[]>(
    'search',
    { q: text, countrycodes: 'in', limit: '5' },
    signal,
  );
  return results.map((result) => ({
    id: String(result.place_id),
    label: result.display_name,
    latitude: Number(result.lat),
    longitude: Number(result.lon),
  }));
}

/** The address at a point, or null when there is none. */
export async function addressAt(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<OsmAddress | null> {
  const result = await nominatim<NominatimResult | { error: string }>(
    'reverse',
    {
      lat: String(latitude),
      lon: String(longitude),
      zoom: '18',
      addressdetails: '1',
    },
    signal,
  );
  return 'address' in result && result.address ? result.address : null;
}
