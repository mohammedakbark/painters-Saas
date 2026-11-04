# Google Maps setup (product owner)

The shop profile uses Google Maps for the map, place search and address suggestions (D-027, SHP-003). Until these keys exist, both apps work without a map: typed address fields plus "Use my current location".

Only the product owner can create the account: Google requires a billing account (a card or UPI on file) even when usage stays inside the free monthly allowance.

## Cost and free allowance (checked 2026-11-04; re-check before relying on it)

- Since March 2025 Google gives a free number of requests **per API (SKU) per month** instead of the old $200 credit. Under India pricing the free allowance is higher than under global pricing. Source: https://developers.google.com/maps/billing-and-pricing/pricing-india
- Showing maps in the **Android and iOS apps (Maps SDK) is free and unlimited**. Source: https://developers.google.com/maps/documentation/android-sdk/usage-and-billing
- The web portal uses the **Maps JavaScript API** (map loads), **Places API (New)** (search box) and the **Geocoding API** (address suggestion when the pin moves). Each has its own free allowance.
- There is **no automatic spending cap**. Set quotas and a budget alert (step 5).

## Steps

1. **Create a Google Cloud project** (for example "paint-shop-dev") at https://console.cloud.google.com and attach a billing account. Choose India as the billing country for India pricing.
2. **Enable the APIs** (APIs & Services → Library):
   - Maps JavaScript API;
   - Places API (New);
   - Geocoding API;
   - Maps SDK for Android;
   - Maps SDK for iOS (later, for the iOS build).
3. **Create a browser key** (APIs & Services → Credentials → Create credentials → API key) and restrict it:
   - Application restrictions: *Websites*. Add `http://localhost:3001/*` for local development and later the portal's real address.
   - API restrictions: Maps JavaScript API, Places API (New), Geocoding API.
   - Put it in `apps/admin_web/.env.local` as `GOOGLE_MAPS_BROWSER_KEY=...` (gitignored). Optionally create a Map ID (Map Management) and set `GOOGLE_MAPS_MAP_ID`; otherwise Google's demo map ID is used.
4. **Create an Android key** and restrict it:
   - Application restrictions: *Android apps*. Add the package name `com.example.shop_app` (a placeholder until the final app ID, question 41) and the SHA-1 of the signing certificate. For local debug builds, run `cd apps/shop_app/android && ./gradlew signingReport` and copy the debug SHA-1.
   - API restrictions: Maps SDK for Android.
   - Put it in `apps/shop_app/android/local.properties` (gitignored) as `GOOGLE_MAPS_API_KEY=...`, and set `"GOOGLE_MAPS_ENABLED": true` in `apps/shop_app/config/local.json`. Rebuild the app.
   - iOS later: an *iOS apps* key restricted to the bundle ID, in `apps/shop_app/ios/Flutter/MapsKey.xcconfig` (gitignored) as `GOOGLE_MAPS_API_KEY=...`.
5. **Guardrails** (Billing and APIs & Services → Quotas):
   - a budget with an alert at a small amount (for example ₹500) sent to your email;
   - per-day quotas on the three web APIs, for example 500 requests per day each for development.

These keys are public by design (they reach the browser or the app). The restrictions in steps 3 and 4 stop other sites and apps from using them. They are not secrets, but they still never go into git.

## Switching provider later

The map is confined to `apps/admin_web/src/app/shops/[shopId]/profile/google-location-map.tsx` (web) and `packages/flutter_shared/lib/src/maps/shop_location_map.dart` (apps). The database stores only coordinates and the address the owner confirmed, so another provider (for example OpenStreetMap-based) can replace these two files.
