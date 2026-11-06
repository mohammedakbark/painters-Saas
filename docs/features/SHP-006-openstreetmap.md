# Feature: Maps on OpenStreetMap

- **Feature ID:** SHP-006
- **Status:** Complete (local verification; see §5)
- **Last updated:** 2026-11-06
- **Related modules:** `apps/admin_web`: `lib/maps/openstreetmap.ts`, `lib/shops/map-address.ts`, `app/shops/[shopId]/profile/osm-location-map.tsx` and `location-picker.tsx`; `packages/flutter_shared`: `ShopLocationMap`; `apps/shop_app`: config and native project files
- **Decisions:** D-041 (OpenStreetMap instead of Google Maps), D-027 (how the shop location is chosen), D-028 (free tiers, replaceable providers)

## 1. Why

Google Maps needs a billing account with a card or UPI, and the product owner chose not to set one up now (2026-11-06). Until then the map, place search and address suggestions from SHP-003 were never available. The owner chose OpenStreetMap, which needs no account or key.

## 2. Behaviour

**Web (shop profile, Map location):**
- **Always shown:** an OpenStreetMap map. The no-map notice is gone.
- **Search** for a shop, street or area. It runs on **Search** or Enter, limited to India, and shows up to 5 places; choosing one places the pin and zooms to street level.
- **Placing the pin:** click the map to place it, or drag it. A pin outside India is refused, as before.
- **Address suggestion:** when the pin settles, the address there is looked up once. As before, the owner sees "Address from the map" with **Use this address** or **Keep what I typed**.
- **Use my current location** is unchanged.
- **If the search service fails:** "The search isn't available right now. Place the pin on the map instead."

**Shop App:** the shop's location is a static OpenStreetMap preview with the pin and the attribution. `MAPS_ENABLED=false` shows the coordinates instead.

**Removed:**
- web: `@vis.gl/react-google-maps`, `@types/google.maps`, and the `GOOGLE_MAPS_BROWSER_KEY` and `GOOGLE_MAPS_MAP_ID` settings;
- apps: `google_maps_flutter`, the Android `com.google.android.geo.API_KEY` meta-data and Gradle placeholder, the iOS `GMSApiKey`, the `GoogleMaps` import and `MapsKey.xcconfig`, and `GOOGLE_MAPS_ENABLED` (now `MAPS_ENABLED`, true by default);
- the Google setup guide, replaced by `docs/guides/MAPS.md`.

## 3. Data, security and privacy

- No API, database or permission change. The API still stores only the coordinates, the source (`MAP_PIN` or `DEVICE_GPS`) and the address the owner confirmed.
- The map search text and the pin's coordinates go from the owner's browser to Nominatim (OpenStreetMap Foundation). Map tiles are fetched for the area on screen. No account or personal data is sent.
- The usage policies are followed (`docs/guides/MAPS.md`): attribution, at most one request per second, search only on submit, one lookup per pin move.

## 4. Limits

- The free services suit development and a small number of shops. Before launch, move tiles (and search if needed) to a hosted provider; the URLs are in one file per platform.
- OpenStreetMap address data for small Indian shops can be incomplete. That is why the owner always confirms the suggested address.
- iOS: the Google Maps wiring is removed but the iOS app has still not been built (no Mac).

## 5. Checks (2026-11-06)

| Check | Result |
|---|---|
| admin_web lint, typecheck, 190 tests (new `openstreetmap.test.ts`: India-only search, address lookup, one request per second, errors; Nominatim address mapping), build; `ui:check` | Passed |
| Flutter format, analyze, tests (flutter_shared 66, including the drawn map with pin and attribution; shop_app 70; customer_app 1) | Passed |
| Android debug build of the Shop App (`flutter build apk --debug`, with Kotlin incremental compilation off for the known Windows cross-drive cache issue) | Passed |
| Headless Chrome against the real services: tiles load with the attribution; searching "MG Road Kochi" lists real places; choosing one sets the pin, zooms in and suggests "Mahatma Gandhi Road, Shenoys, Ernakulam, 682035"; at 1280 px and 518 px; no console errors | Verified |
| Shop App map on an Android emulator | **Not run** |
