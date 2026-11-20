# Feature: Find shops, shop page and My Shops (Customer App)

- **Feature ID:** CUS-002
- **Status:** Complete (local; API e2e, Flutter tests, main path on a physical Android phone 2026-11-20)
- **Last updated:** 2026-11-20
- **Related modules:** API module `apps/api/src/shop-discovery` (`GET /v1/discover/shops`, `/districts`, `/{shopId}`; `GET /v1/me/shops`, `PUT/DELETE /v1/me/shops/{shopId}`), migration `cus_002_my_shops` (`customer_shops`); Customer App `lib/src/shops`, `lib/src/location`, `lib/src/features/shops`; `flutter_shared` `AppBadge` (shrinks instead of overflowing)
- **Decisions:** D-037, D-038, D-058 (My Shops is private; what a shop page shows), D-046 (pickup always offered), question 39 (shop phone stays hidden), question 59 (no ratings or offers)

## 1. Goal

A painter or customer finds paint shops, opens any Live shop without adding it, keeps the shops they use in My Shops, and picks the shop they are shopping from. The storefront (CUS-003) builds on the active shop.

## 2. Behaviour

1. **Find shops** (from Home or the search icon on Home and My Shops): every Live shop, with a name search and Load more (20 at a time).
   - **Near me** asks for the phone's approximate location only when tapped and lists the nearest shops first, with the distance ("800 m", "62.4 km").
   - **Choose district** lists the districts that have Live shops (with counts). That district's shops come first, then the rest by name (D-038).
   - With neither, shops are listed by name. There is no distance cut-off.
   - Location off, refused or failing shows a message offering Choose district. Blocked permanently offers Settings.
2. **Shop card:** photo (or a placeholder), name, area and district, distance, then **Delivers** or **Pickup only**, plus **In My Shops** or **Shopping here**.
3. **Shop page:** photo, name, place and distance, then **Pickup and delivery**: "Pickup at the shop", and either "No delivery" or "Delivers within N km" with the charge and the free-above amount. Then the full address with the map pin. The shop's phone, staff, prices and settings are never shown.
   - **Add shop / Remove shop** changes My Shops instantly, with no approval (D-037), and shows a toast.
   - **Shop here** makes it the active shop and goes to Home.
4. **My Shops** tab: the person's shops, most recently added first. Empty state with Find shops. Pull to refresh.
5. **Home:** "Shopping from" with the active shop card and **Change shop**, or **Choose a shop** with Find shops. An active shop that is no longer Live is forgotten.

## 3. Privacy and tenant rules

- Only shops with status ACTIVE (Live) can be listed, opened or added. Draft and in-review shops answer 404, so their existence is not revealed.
- The public shop view is an allow-list (`PublicShopSchema`): it never includes the support mobile, order messages, status, members or anything tenant-private. While delivery is off, the stored charge and distance are not returned.
- My Shops is private to the person (D-058). Nobody else's list can be read or changed, and the shop is not told: no shop customer record is created. Tests prove both.
- The position is sent rounded to 3 decimals (about 100 m), used only to sort, and never stored or logged. Android asks only for approximate location (`ACCESS_COARSE_LOCATION`).
- The active shop is a convenience kept on the phone (secure storage) and cleared on sign-out.

## 4. Not included

- The storefront: products, categories and prices (CUS-003).
- Cross-shop product search, painter confirmation, credit, ratings, offers (question 59), the shop's phone (question 39).

## 5. Verification (2026-11-20)

| Check | Result |
|---|---|
| API e2e `shop-discovery.e2e-spec.ts` (11): sign-in required, nearest first with the distance, district first, name search and pages, half a position refused, no private data, delivery only when on, draft and in-review hidden, districts, add/remove idempotent, private per person and not told to the shop | Passed; full API suite 188 e2e and 122 unit |
| Flutter customer_app (18, 9 new: list by name, Near me, district fallback, blocked location to Settings, Load more, shop page with add/remove and the list updating, Shop here, forgotten shop, sign-out clears the active shop), flutter_shared (92), shop_app (183), `pnpm ui:check`, analyze | Passed |
| Physical phone (local stack) | Find shops with the Live shop and its photo. Near me with location off showed the message, then Choose district. Shop page with delivery terms and address. Add shop, then Shop here leading to Home with "Shopping from". The `customer_shops` row was checked, with no shop customer record. The map area stayed grey (tiles did not load on the phone; to recheck on Wi-Fi). The shortened "Add shop" label passed the tests only |
