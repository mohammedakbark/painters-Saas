/** Messages for the browser's "Use my current location" (SHP-003). */
export const GEOLOCATION_MESSAGES = {
  unsupported:
    "This browser can't share its location. Place the pin on the map instead.",
  denied:
    'Location access is blocked. Allow location for this site in your browser settings, then try again.',
  unavailable:
    "Your location isn't available right now. Check that location is turned on, then try again.",
  timeout:
    'Finding your location took too long. Try again, or place the pin on the map.',
  outsideIndia: 'That location is outside India. Place the pin at the shop.',
  insecure: 'Location works only on a secure (HTTPS) connection.',
  inaccurate: (meters: number) =>
    `This device could only find your location to within about ${formatDistance(meters)}, which is too rough for a shop pin. Use the Shop App on your phone at the shop, or place the pin on the map.`,
} as const;

/** GeolocationPositionError codes (W3C): 1 denied, 2 unavailable, 3 timeout. */
export function geolocationErrorMessage(code: number): string {
  switch (code) {
    case 1:
      return GEOLOCATION_MESSAGES.denied;
    case 3:
      return GEOLOCATION_MESSAGES.timeout;
    default:
      return GEOLOCATION_MESSAGES.unavailable;
  }
}

/**
 * A device location less precise than this is not used as the shop pin.
 * Phones with GPS are usually within 5–50 m; computers without GPS often
 * guess from the network, kilometres away.
 */
export const MAX_LOCATION_ACCURACY_METERS = 500;

function formatDistance(meters: number): string {
  return meters >= 1000
    ? `${Math.round(meters / 1000)} km`
    : `${Math.round(meters)} m`;
}

/** Same bounding box as the API (initial market: India). */
export function isInIndia(latitude: number, longitude: number): boolean {
  return latitude >= 6 && latitude <= 38 && longitude >= 68 && longitude <= 98;
}

/** Kochi, used to centre an empty map (initial market: Kerala). */
export const DEFAULT_MAP_CENTER = { lat: 9.9312, lng: 76.2673 } as const;
