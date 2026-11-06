# Feature: Shop profile, address and map location

- **Feature ID:** SHP-003
- **Status:** Complete (local verification; see §13)
- **Last updated:** 2026-11-04
- **Related modules:** API (`apps/api/src/shops/`), web portal (`/shops/[shopId]/profile`, overview checklist), Shop App (shop profile screen), `packages/flutter_shared` (`ShopLocationMap`)
- **Decisions:** D-012 (onboarding checklist), D-027 (address on a Google map plus current location), D-028 (free tiers, replaceable providers), D-033 (edit lock during review, built with PLT-002)

> **Maps changed in SHP-006 (D-041):** Google Maps was replaced by OpenStreetMap (Leaflet, Nominatim, flutter_map) and the Google keys and settings below were removed. The Google details in this document describe the first implementation; see `docs/features/SHP-006-openstreetmap.md` for the current one.

## 1. Problem and goal

A shop goes live only after its owner completes the onboarding checklist (D-012). This feature covers three checklist items:
- the shop **address**;
- its **map location**;
- the customer **support mobile**.

Customers will find the shop with the pin, and its location will be shown on a map in the mobile apps.

## 2. User roles and permissions

| Role | Can | Cannot |
|---|---|---|
| Shop master | See and change the profile on the web; set the location from the Shop App with "Use my current location" | Change another shop's profile (404) |
| Future staff roles | See the profile (read-only) | Change it: 403 `shop_permission_denied` (`requireShopRole`) |
| Non-members, including platform admins | Nothing (404 `shop_not_found`) | — |

## 3. Preconditions

- The shop is registered (SHP-001).
- **Map display, place search and address suggestions** use OpenStreetMap since SHP-006 (D-041); no keys are needed. See `docs/features/SHP-006-openstreetmap.md`.

## 4. User flow

**Web portal** (`/shops/[shopId]/profile`, the **Profile** navigation item):
1. The owner enters the support mobile and the address: shop number and street; area (optional); landmark (optional); city or town; district; state (Kerala preselected); PIN code.
2. The owner sets the location:
   - **with a Maps key:** search for a place, click the map or drag the pin. The pin is reverse-geocoded into an address **suggestion**, which the owner can use or ignore.
   - **without a key:** a notice explains that the map isn't set up.
   - **"Use my current location"** works in both cases (browser geolocation).
3. **Save profile** stores everything and shows "Profile saved".
4. The shop **Overview** shows the checklist ("x of y done") with **Done** / **To do** and an **Add** link for each open item.

**Shop App** (**Shop profile**, from the shop home):
1. The owner sees the address, the support mobile and the map, or the coordinates when the build has no Maps key.
2. **Use my current location:**
   - Android asks for location permission;
   - a confirmation shows the position and its accuracy;
   - **Save location** stores it.

Failure paths:
- **Web:** location blocked, unavailable or timed out; insecure (non-https) connection; outside India; **less precise than 500 m** (computers without GPS often guess kilometres away); an invalid field (message under the field, typed values kept).
- **App:**
  - permission denied → **Try again**;
  - denied permanently → **Open settings**;
  - location services off → **Turn on location**;
  - failed or timed out → **Try again**;
  - outside India;
  - less precise than 500 m;
  - save refused (not the owner) or failed.

## 5. Business rules

1. The support mobile is an Indian mobile number, stored in E.164 format. It is not shown to customers yet (question 39).
2. The address is all or nothing. Shop number and street, city, district, state and PIN code are required together; area and landmark are optional. A blank form clears the address.
3. The location is stored with six decimals, together with its source:
   - `MAP_PIN`: the pin was placed or moved on the map;
   - `DEVICE_GPS`: it came from a browser or phone location.
4. Coordinates must be inside India's bounding box: latitude 6–38, longitude 68–98 (assumption: initial market).
5. A device location less precise than **500 m** is not used (assumption: data quality; phones with GPS are usually within 5–50 m).
6. Address fields are only **suggested** from the map; the owner always confirms them.
7. The checklist is computed by the API (`GET /onboarding`). SHP-004 adds the photo item and CAT-002 the products item.
8. Editing is locked while the shop is in review (D-033); that is built with PLT-002.

## 6. UI requirements

**Web:**
- Fieldsets for Customer support, Shop address and Map location.
- The new `SelectField` component for the state.
- Controlled inputs, so the map can fill the address. The form submits inside a transition so React's automatic form reset doesn't clear the State select; without JavaScript the form still posts.
- Loading, success and error states; field errors linked with `aria-describedby`.
- Each page's data loads inside its own `<Suspense>` (`PageLoading`), so moving between console pages is instant.

**Shop App:**
- Cards for each section, with "Not added yet" when empty.
- The `ShopLocationMap` widget from `flutter_shared` (a static lite-mode map, or the coordinates when there is no key).
- 48 px minimum touch targets; messages wrap and are announced (live region).

## 7. API contract

All routes are `@ShopScoped()` (membership of `:shopId`, otherwise 404). Writes also need the MASTER role (403 `shop_permission_denied`).

| Route | Body | Response |
|---|---|---|
| `GET /v1/shops/:shopId/profile` | — | `ShopProfile`: `shopId`, `shopName`, `status`, `supportPhone` (E.164, nullable), `address` (with `stateName`, nullable), `location` (`latitude`, `longitude`, `source`, `updatedAt`, nullable), `updatedAt` |
| `PUT /v1/shops/:shopId/profile` | `supportPhone` (string or null), `address` (object or null), optional `location` (omitted = unchanged) | `ShopProfile` |
| `PUT /v1/shops/:shopId/location` | `latitude`, `longitude`, `source` | `ShopProfile` |
| `GET /v1/shops/:shopId/onboarding` | — | `ShopOnboarding`: `items[{key, done}]`, keys `address`, `location`, `support_phone` |

Validation errors are 400 `validation_failed` with paths such as `address.postalCode` and `location.latitude`.

## 8. Data model and migrations

Migration `20261104062018_shp_003_shop_profile` adds nullable columns to `shops`:
- `support_phone`;
- `address_line1`, `address_line2`, `landmark`, `city`, `district`, `state_code`, `postal_code`;
- `latitude` and `longitude` (`numeric(9,6)`), `location_source` (enum `shop_location_source`), `location_updated_at`;
- `profile_updated_at`.

Hand-written CHECK constraints:
- Indian mobile format;
- trimmed text within the API's length limits;
- state code `^[A-Z]{2}$`;
- PIN code `^[1-9][0-9]{5}$`;
- the required address fields set together;
- the location fields set together, inside India's bounding box.

State codes are the two-letter subdivision codes of ISO 3166-2:IN, 2023 revision. The web list is checked against the OpenAPI contract by a test.

## 9. Security and privacy

- **Tenant boundary:**
  - e2e tests try every route as the owner of another shop, both ways, and get 404 with nothing changed;
  - platform admins and users without shops get 404;
  - in Chrome, owner B opening owner A's profile URL sees "Shop not found", with no profile data in the response.
- **Audit:**
  - `shop.profile_updated` records the **names** of the changed fields (`supportPhone`, `address`, `location`); nothing is written when nothing changed;
  - `shop.location_updated` records the source only;
  - phone numbers, addresses and coordinates never go into audit metadata, and the logs were checked for them.
- **Device location:**
  - read only when the owner taps "Use my current location", and saved only after confirmation;
  - the Shop App logs only the error type, in debug builds only.
- **Android location source:**
  - The app uses the system location provider, not Google Play services' fused provider.
  - The fused provider shows Google's "Location Accuracy" consent prompt. When that prompt was declined, the request hung until the time limit (seen on the emulator).
  - The system provider needs no extra consent and no Google dependency (D-028).
- **Maps keys:**
  - The Google browser key and the Android/iOS keys are **public by design**; they are restricted in Google Cloud (setup guide).
  - The web key comes from server-only env (`GOOGLE_MAPS_BROWSER_KEY`) and reaches the browser only when configured.
  - The native keys come from gitignored files (`android/local.properties`, `ios/Flutter/MapsKey.xcconfig`).

## 10. Acceptance criteria

- [x] The owner can save the support mobile, address and location on the web; the values are normalised (E.164, trimmed) and shown again on reload.
- [x] Invalid input (mobile, PIN code, state, required address fields, a location outside India) gives a field error and saves nothing; typed values, including the State select, are kept.
- [x] "Use my current location" sets the pin on the web (browser) and in the Shop App (phone), refusing imprecise (> 500 m) or out-of-India positions.
- [x] Without a Maps key, both apps work: the web shows a notice and the coordinates, and the app shows "Map not available in this build" with the coordinates.
- [x] The overview checklist shows address, map location and support mobile as **Done** or **To do**, with links.
- [x] The Shop App shows the profile saved on the web and can set the location after permission and confirmation.
- [x] Another shop's owner, a platform admin and a user without shops get 404 on every profile route.
- [x] Audit events contain field names or the source only.
- [ ] **Not verified (needs the product owner's Google keys):** the map, place search and address suggestions (web), and the rendered map (app).

## 11. Test plan

- **API unit tests:** `parseIndianMobile`, `requireShopRole`.
- **API e2e (12 new):**
  - empty profile and checklist;
  - full save and normalisation, audit content and no values in it;
  - location kept when omitted, null clears;
  - no audit event when nothing changed;
  - field errors;
  - PUT requires both keys;
  - the location endpoint (valid, invalid);
  - cross-tenant on all four routes;
  - platform admin and user without shops;
  - malformed id and missing token;
  - database constraints.
- **Web (25 new):**
  - form parsing and API error mapping;
  - map-address suggestions (Geocoder and Places shapes);
  - geolocation messages;
  - state list vs. the contract;
  - checklist component;
  - profile form: no-map notice, device location, denied, outside India, too imprecise, insecure context, read-only, field errors with values and State kept.
- **Flutter (14 new):**
  - Shop App: address and mobile shown, empty profile, save after confirmation, cancel, imprecise, outside India, service off, denied for good, denied, refused or failed save, JSON parsing, India bounding box;
  - `flutter_shared`: coordinates format, no-map fallback.
- **Manual:** Chrome (web) and the Android emulator (Shop App); see §13.

## 12. Dependencies and open questions

- Maps: replaced by OpenStreetMap in SHP-006 (D-041); no keys.
- iOS: the location permission text, Maps key wiring and `GoogleMaps` import are added but **not built** (no Mac). The Podfile may need a higher iOS deployment target for `google_maps_flutter`.
- Showing the support mobile to customers: question 39.

## 13. Implementation notes

**API:**
- `src/shops/shop-profile.{schemas,service,controller}.ts` and `src/shops/indian-states.ts`;
- `src/common/phone/indian-mobile.ts`;
- `src/shop-access/shop-roles.ts` (`requireShopRole`, `PROFILE_MANAGER_ROLES`);
- audit actions `shop.profile_updated` and `shop.location_updated`.

**Web:**
- `src/app/shops/[shopId]/profile/`: `page.tsx`, `profile-form.tsx`, `location-picker.tsx`, `google-location-map.tsx` (lazy-loaded with `@vis.gl/react-google-maps` 1.10.2: Places API (New) autocomplete element and Geocoder) and `actions.ts`;
- `src/lib/shops/` (`profile`, `map-address`, `geolocation`, `indian-states`) and `src/lib/api/shop-profile.ts`;
- components `SelectField`, `PageLoading` and `OnboardingChecklist`;
- env `GOOGLE_MAPS_BROWSER_KEY` and `GOOGLE_MAPS_MAP_ID` (optional).

**Flutter:**
- `flutter_shared`: `ShopLocationMap`, `formatCoordinates` (`google_maps_flutter` 2.19.0);
- Shop App:
  - `lib/src/shops/shop_profile.dart` (models and repository);
  - `lib/src/location/location_service.dart` (`geolocator` 14.1.2, system provider on Android);
  - `features/shops/shop_profile_screen.dart`;
  - route `/shops/:shopId/profile`;
  - `AppConfig.mapsEnabled` (`GOOGLE_MAPS_ENABLED`);
  - `ApiClient.putJson`.
- Android: location permissions and the Maps key meta-data from `local.properties`. iOS: Info.plist keys and `AppDelegate`.

**Found and fixed during the browser and emulator checks:**
1. Client navigation between console pages was not instant: Next.js warned about request data outside `<Suspense>`. Each page now wraps its data in `<Suspense>`.
2. The State select reset to "Choose the state" after a failed save (React's form reset). Submission now runs in a transition.
3. A desktop browser located the computer only within about 50 km and the pin was accepted. Locations less precise than 500 m are now refused, on web and app.
4. Declining Google's "Location Accuracy" prompt made the Shop App's request hang until the time limit. The app now uses Android's system location provider.

**Verified locally (2026-11-04):**
- **Chrome** (this computer's browser, via Claude in Chrome):
  - OTP sign-in;
  - checklist 0 of 3;
  - invalid PIN error with values and State kept;
  - device location (a 50 km result refused after the fix, a 149 m result accepted);
  - save and stored values;
  - checklist 3 of 3;
  - console navigation with no warnings;
  - owner B gets "Shop not found" on owner A's URL.
- **Android emulator** (`emulator-5554`):
  - the profile saved on the web shows in the app;
  - permission denied, then Try again, then allowed;
  - the Google prompt declined (privacy-preserving choice);
  - a test GPS position (Android test provider, 8 m) leads to confirmation and "Shop location saved";
  - the database holds `DEVICE_GPS`, and the audit holds the source only.
- **Builds:** no secret key in the APK or the web bundle.

The full check list is in `docs/PROJECT_STATE.md` §6.

## 14. Change history

| Date | Change |
|---|---|
| 2026-11-04 | Specification and implementation (D-027, D-028); four issues found in the browser and emulator checks fixed |
